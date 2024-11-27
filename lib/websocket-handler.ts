

// lib/websocket-handler.ts

import { ConversationItem, WebSocketMessage } from '@/components/agent-console/utils/types';

/**
 * 
 * **EnhancedWebSocketHandler Interface**
 * 
 * Defines the public methods exposed by the EnhancedWebSocketHandler class.
 */
interface IEnhancedWebSocketHandler {
    connect(): Promise<void>;
    disconnect(): void;
    sendMessage(message: any): Promise<void>;
    isConnected(): boolean;
    getReadyState(): number;
    cleanupAudio(): Promise<void>;
    interruptAudio(itemId: string): Promise<void>;
}

/**
 * **EnhancedWebSocketHandler**
 * 
 * This class manages the WebSocket connection, handles incoming messages,
 * processes audio data, and ensures proper audio playback without overlaps.
 * Implements the Singleton pattern to ensure only one instance exists.
 */
class EnhancedWebSocketHandler implements IEnhancedWebSocketHandler {
    private static instance: EnhancedWebSocketHandler | null = null;

    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private readonly MAX_RECONNECT_ATTEMPTS = 5;
    private readonly MAX_QUEUE_SIZE = 1000;
    private reconnectTimeout: number | null = null;
    private messageQueue: any[] = [];
    private isReady = false;
    private readonly SAMPLE_RATE = 24000; // Original sample rate from server
    private readonly CHUNK_SIZE = 1920;   // Chunk size (80ms at 24kHz)

    private pendingAudioData: Int16Array | null = null;

    // Audio Playback Management
    private audioContext: AudioContext | null = null;
    private audioBufferQueue: Float32Array[] = [];
    private isPlaying = false;

    // Deduplication Maps
    private readonly audioBufferMap: Map<string, Set<string>> = new Map(); // Tracks processed chunks per item
    private readonly processingAudioChunks: Set<string> = new Set();      // Tracks items currently being processed

    // Deduplication for transcript events
    private readonly processedTranscriptEvents: Set<string> = new Set();

    /**
     * **getInstance**
     * 
     * Provides a singleton instance of EnhancedWebSocketHandler.
     * @param url - WebSocket server URL.
     * @param agentId - Agent identifier for authentication.
     * @param onMessage - Callback for handling incoming messages.
     * @param onConnectionChange - Callback for handling connection status changes.
     * @returns The singleton instance of EnhancedWebSocketHandler.
     */
    public static getInstance(
        url: string,
        agentId: string,
        onMessage: (data: any) => void,
        onConnectionChange: (status: boolean) => void
    ): EnhancedWebSocketHandler {
        if (!EnhancedWebSocketHandler.instance) {
            EnhancedWebSocketHandler.instance = new EnhancedWebSocketHandler(url, agentId, onMessage, onConnectionChange);
        }
        return EnhancedWebSocketHandler.instance;
    }

    private constructor(
        private url: string,
        private agentId: string,
        private onMessage: (data: any) => void,
        private onConnectionChange: (status: boolean) => void
    ) {}

    /**
     * **Connect to WebSocket**
     * Establishes the WebSocket connection and sets up event handlers.
     */
    async connect(): Promise<void> {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }

        // Clean up any existing connection
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        return new Promise<void>((resolve, reject) => {
            try {
                // Add authentication via query parameters
                const wsUrlWithAuth = `${this.url}?agent_id=${encodeURIComponent(this.agentId)}`;
                this.ws = new WebSocket(wsUrlWithAuth);

                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.onConnectionChange(true);
                    this.reconnectAttempts = 0;
                    // Send initial session configuration
                    this.sendInitialSessionConfig();
                    this.isReady = true;
                    this.processQueuedMessages();
                    resolve();
                };

                this.ws.onmessage = this.handleWebSocketMessage.bind(this);

                this.ws.onclose = (event) => {
                    console.warn('WebSocket closed:', event.reason);
                    this.isReady = false;
                    this.onConnectionChange(false);
                    this.handleReconnect();
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    // The onclose event will handle reconnection
                };
            } catch (error) {
                console.error('Error creating WebSocket:', error);
                reject(error);
            }
        });
    }





    /**
     * **Send Initial Session Configuration**
     * Sends the initial session configuration after connection is established.
     */
    private sendInitialSessionConfig(): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        try {
            this.ws.send(JSON.stringify({
                type: 'session.update',
                session: {
                    modalities: ['text', 'audio'],
                    voice: "alloy",
                    input_audio_format: "pcm16",
                    output_audio_format: "pcm16",
                    input_audio_transcription: {
                        model: "whisper-1"
                    },
                    turn_detection: {
                        type: 'server_vad',
                        threshold: 0.8,
                        prefix_padding_ms: 300,
                        silence_duration_ms: 800
                    },
                    instructions: "I am a helpful assistant.",
                    tool_choice: "auto",
                    temperature: 0.8,
                    max_response_output_tokens: 4000
                }
            }));
            console.log('Session configuration sent');
        } catch (error) {
            console.error('Error sending session configuration:', error);
        }
    }

    /**
     * **Handle Incoming WebSocket Messages**
     * Parses and routes incoming WebSocket messages based on their type.
     * @param event - The WebSocket message event.
     */
    private handleWebSocketMessage(event: MessageEvent): void {
        try {
            const data: WebSocketMessage = JSON.parse(event.data);
            console.log('WebSocket received:', data.type, data);

            switch (data.type) {
                // Error Events
                case 'error':
                    this.handleErrorEvent(data);
                    break;

                // Session Events
                case 'session.created':
                case 'session.updated':
                    this.handleSessionEvent(data);
                    break;

                // Conversation Events
                case 'conversation.created':
                case 'conversation.item.created':
                case 'conversation.item.deleted':
                case 'conversation.item.truncated':
                    this.onMessage(data);
                    break;

                // Input Audio Buffer Events
                case 'input_audio_buffer.committed':
                case 'input_audio_buffer.cleared':
                case 'input_audio_buffer.speech_started':
                case 'input_audio_buffer.speech_stopped':
                    this.onMessage(data);
                    break;

                // Audio and Transcription Events
                case 'response.audio.delta':
                    if (data.delta && data.item_id) {
                        this.handleAudioDeltaWithDeduplication(data);
                    }
                    break;

                case 'response.audio.done':
                    if (data.item_id) {
                        this.cleanupAudioBuffers(data.item_id);
                    }
                    this.onMessage(data);
                    break;

                case 'response.audio_transcript.delta':
                    if (data.event_id && data.item_id) {
                        this.handleAudioTranscriptDelta(data);
                    }
                    break;

                case 'response.audio_transcript.done':
                    if (data.item_id) {
                        this.handleAudioTranscriptDone(data);
                    }
                    break;

                // Content and Response Events
                case 'response.content_part.added':
                case 'response.content_part.done':
                case 'response.output_item.added':
                case 'response.output_item.done':
                case 'response.created':
                case 'response.done':
                case 'response.text.delta':
                case 'response.text.done':
                case 'response.function_call_arguments.delta':
                case 'response.function_call_arguments.done':
                    this.onMessage(data);
                    break;

                // Rate Limits Event
                case 'rate_limits.updated':
                    this.handleRateLimitsUpdated(data);
                    break;

                // Transcription Completion
                case 'conversation.item.input_audio_transcription.completed':
                    this.handleTranscriptionCompleted(data);
                    break;

                default:
                    console.warn('Unhandled message type:', data.type);
                    // Forward unhandled messages to maintain compatibility
                    this.onMessage(data);
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    }

    /**
     * **Handle Error Events**
     * Processes error messages from the WebSocket.
     * @param data - The WebSocket message data.
     */
    private handleErrorEvent(data: WebSocketMessage): void {
        const errorMessage = data.message || 'Unknown error';
        console.error('WebSocket error message:', errorMessage);

        // Handle specific expected errors without forwarding
        if (errorMessage.includes("Cannot update a conversation's voice")) {
            console.log('Voice update skipped - conversation already has audio');
        } else if (errorMessage === 'RealtimeAPI is not connected') {
            // Critical error: Attempt to notify user and possibly reset connection
            console.error('Critical error: RealtimeAPI is not connected');
            // Optionally notify the user through onMessage or other means
            this.onMessage(data);
            // Optionally attempt to reconnect
            this.handleReconnect();
        } else {
            this.onMessage(data);
        }
    }

    /**
     * **Handle Session Events**
     * Logs and forwards session-related events.
     * @param data - The WebSocket message data.
     */
    private handleSessionEvent(data: WebSocketMessage): void {
        console.log(`Session ${data.type}:`, data.session);
        this.onMessage(data);
    }

    /**
     * **Convert Base64 to Int16Array**
     * Decodes a base64-encoded string into an Int16Array audio buffer.
     * @param base64 - The base64-encoded audio string.
     * @returns An Int16Array representing the audio buffer or null if conversion fails.
     */
    private base64ToInt16Array(base64: string): Int16Array | null {
        try {
            // Decode base64 to binary string
            const binaryString = atob(base64);
            const len = binaryString.length;

            // Create byte array
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Convert to Int16Array (16-bit PCM)
            const samples = new Int16Array(bytes.buffer);

            // Validate audio sample range
            this.validateAudioSamples(samples);

            return samples;
        } catch (error) {
            console.error('Error converting base64 to Int16Array:', error);
            return null;
        }
    }

    /**
     * **Validate Audio Samples**
     * Ensures audio samples are within the valid 16-bit PCM range.
     * @param samples - The Int16Array containing audio samples.
     * @throws Error if samples are invalid.
     */
    private validateAudioSamples(samples: Int16Array): void {
        if (samples.length === 0) {
            throw new Error('Empty audio sample buffer');
        }

        // Check the first few samples to ensure they're within valid range
        const sampleCount = Math.min(1000, samples.length);
        let maxSample = -32768;
        let minSample = 32767;

        for (let i = 0; i < sampleCount; i++) {
            const sample = samples[i];
            maxSample = Math.max(maxSample, sample);
            minSample = Math.min(minSample, sample);

            if (sample > 32767 || sample < -32768) {
                throw new Error('Invalid audio sample values detected');
            }
        }

        // Log sample range for debugging (only in development)
        if (process.env.NODE_ENV === 'development') {
            console.debug(`Audio sample range: ${minSample} to ${maxSample}`);
        }
    }

    /**
     * **Handle Audio Delta Messages with Deduplication**
     * Processes incoming audio delta messages by converting and enqueueing audio buffers.
     * Ensures that duplicate audio chunks are not enqueued.
     * @param data - The WebSocket message data containing audio delta.
     */
    private handleAudioDeltaWithDeduplication(data: WebSocketMessage): void {
        const itemId = data.item_id!;
        const chunkId = this.generateChunkId(data.delta!);

        // Initialize tracking set for this item if it doesn't exist
        if (!this.audioBufferMap.has(itemId)) {
            this.audioBufferMap.set(itemId, new Set());
        }

        // Check if we've already processed this chunk
        const processedChunks = this.audioBufferMap.get(itemId)!;
        if (processedChunks.has(chunkId)) {
            console.debug(`Skipping duplicate audio chunk for item ${itemId}`);
            return;
        }

        // Mark this chunk as processed
        processedChunks.add(chunkId);

        try {
            const audioBuffer = this.base64ToInt16Array(data.delta!);
            if (!audioBuffer || audioBuffer.length === 0) {
                console.warn('Invalid audio buffer received');
                return;
            }

            // Add to processing queue
            const float32Buffer = this.convertInt16ArrayToFloat32(audioBuffer);
            this.audioBufferQueue.push(float32Buffer);

            // Process queue if not already processing
            if (!this.isPlaying) {
                this.playAudioBuffers().catch(console.error);
            }

        } catch (error) {
            console.error('Error processing audio delta:', error);
            this.cleanupAudioBuffers(itemId);
        }
    }

    /**
     * **Convert Int16Array to Float32Array**
     * Converts Int16 PCM data to Float32 format for Web Audio API.
     * @param int16Array - The Int16Array audio buffer.
     * @returns A Float32Array representing the normalized audio buffer.
     */
    private convertInt16ArrayToFloat32(int16Array: Int16Array): Float32Array {
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0;
        }
        return float32Array;
    }

    /**
     * **Handle Audio Transcript Delta Messages**
     * Processes incoming audio transcript delta messages with deduplication.
     * @param data - The WebSocket message data containing audio transcript delta.
     */
    private handleAudioTranscriptDelta(data: WebSocketMessage): void {
        const { event_id, item_id, transcript_delta } = data;

        if (this.processedTranscriptEvents.has(event_id!)) {
            console.debug(`Skipping duplicate transcript event ${event_id} for item ${item_id}`);
            return;
        }

        this.processedTranscriptEvents.add(event_id!);

        // Forward the transcript delta to the message handler
        this.onMessage(data);
    }

    /**
     * **Handle Audio Transcript Done**
     * Processes the completion of audio transcript.
     * @param data - The WebSocket message data indicating transcript completion.
     */
    private handleAudioTranscriptDone(data: WebSocketMessage): void {
        const { item_id, transcript } = data;
        console.log(`Transcription completed for item ${item_id}: "${transcript.trim()}"`);
        // Forward the transcript done message to the message handler
        this.onMessage(data);
    }

    /**
     * **Handle Rate Limits Updated**
     * Processes rate limit updates from the server.
     * @param data - The WebSocket message data containing rate limit information.
     */
    private handleRateLimitsUpdated(data: WebSocketMessage): void {
        const { rate_limits } = data;
        console.warn('Rate limits updated:', rate_limits);
        // Implement throttling or queuing logic based on rate_limits if necessary
        this.onMessage(data);
    }

    /**
     * **Handle Transcription Completed**
     * Processes the completion of an audio transcription.
     * @param data - The WebSocket message data indicating transcription completion.
     */
    private handleTranscriptionCompleted(data: WebSocketMessage): void {
        const { item_id, transcript } = data;
        console.log(`Transcription completed for item ${item_id}: "${transcript.trim()}"`);
        // Forward the transcription completion to the message handler
        this.onMessage(data);
    }

    /**
     * **Play Audio Buffers Sequentially**
     * Plays all enqueued audio buffers one after another without overlapping.
     */
    private async playAudioBuffers(): Promise<void> {
        if (this.isPlaying || this.audioBufferQueue.length === 0) return;

        await this.ensureAudioContext();
        this.isPlaying = true;

        try {
            while (this.audioBufferQueue.length > 0) {
                const buffer = this.audioBufferQueue.shift()!;

                if (!buffer || buffer.length === 0) {
                    console.warn('Skipping empty buffer');
                    continue;
                }

                // Create audio buffer
                const audioBuffer = this.audioContext!.createBuffer(
                    1, // mono
                    buffer.length,
                    this.SAMPLE_RATE
                );

                // Copy the Float32 data
                const channelData = audioBuffer.getChannelData(0);
                channelData.set(buffer);

                // Create and connect source
                const source = this.audioContext!.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.audioContext!.destination);

                // Play and wait for completion
                source.start();
                await new Promise<void>((resolve) => {
                    source.onended = () => resolve();
                });
            }
        } catch (error) {
            console.error('Error playing audio buffers:', error);
        } finally {
            this.isPlaying = false;

            // If there are new buffers that arrived during playback, restart playback
            if (this.audioBufferQueue.length > 0) {
                // Small delay before playing next chunk to prevent overlap
                await new Promise(resolve => setTimeout(resolve, 50));
                this.playAudioBuffers().catch(console.error);
            }
        }
    }

    /**
     * **Ensure AudioContext**
     * Initializes or resumes the AudioContext as needed.
     * @returns The active AudioContext.
     */
    private async ensureAudioContext(): Promise<AudioContext> {
        if (!this.audioContext || this.audioContext.state === 'closed') {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: this.SAMPLE_RATE // Match server sample rate
            });
            console.log('AudioContext initialized');
        }
        
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            console.log('AudioContext resumed');
        }
        
        return this.audioContext;
    }

    /**
     * **Process Queued Messages**
     * Sends any messages that were queued while the WebSocket was not ready.
     */
    private async processQueuedMessages(): Promise<void> {
        if (!this.isReady || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        const messages = this.messageQueue.slice();
        this.messageQueue = [];

        for (const message of messages) {
            try {
                await this.sendMessage(message);
                // Optional: Introduce a slight delay to prevent message flooding
                await new Promise(resolve => setTimeout(resolve, 5));
            } catch (error) {
                console.error('Error processing queued message:', error);
                if (this.messageQueue.length < this.MAX_QUEUE_SIZE) {
                    this.messageQueue.push(message);
                }
            }
        }
    }

    /**
     * **Send Message**
     * Sends a message through the WebSocket connection. If the connection is not ready,
     * queues the message for later sending.
     * @param message - The message object to send.
     */
    async sendMessage(message: any): Promise<void> {
        if (!this.isReady || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            if (this.messageQueue.length < this.MAX_QUEUE_SIZE) {
                this.messageQueue.push(message);
                console.warn('Message queued due to unavailable WebSocket connection:', message);
            }
            return;
        }

        try {
            if (message.type === 'input_audio_buffer.append' && message.audio) {
                await this.handleAudioBufferMessage(message);
            } else {
                this.ws.send(JSON.stringify(message));
                console.log('Message sent:', message);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    /**
     * **Handle Audio Buffer Message**
     * Processes and sends audio buffer messages in chunks to the server.
     * @param message - The message object containing audio data.
     */
    private async handleAudioBufferMessage(message: { audio: Int16Array | ArrayBuffer | string }): Promise<void> {
        try {
            let audioData: Int16Array;

            if (message.audio instanceof Int16Array) {
                audioData = message.audio;
            } else if (message.audio instanceof ArrayBuffer) {
                audioData = new Int16Array(message.audio);
            } else if (typeof message.audio === 'string') {
                const binaryStr = atob(message.audio);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                    bytes[i] = binaryStr.charCodeAt(i);
                }
                audioData = new Int16Array(bytes.buffer);
            } else {
                throw new Error('Invalid audio data format');
            }

            if (this.pendingAudioData) {
                const combinedLength = this.pendingAudioData.length + audioData.length;
                const combinedData = new Int16Array(combinedLength);
                combinedData.set(this.pendingAudioData, 0);
                combinedData.set(audioData, this.pendingAudioData.length);
                audioData = combinedData;
                this.pendingAudioData = null;
            }

            let offset = 0;
            while (offset + this.CHUNK_SIZE <= audioData.length) {
                const chunk = audioData.slice(offset, offset + this.CHUNK_SIZE);
                if (this.ws?.readyState === WebSocket.OPEN) {
                    const base64Audio = this.int16ArrayToBase64(chunk);
                    await this.ws.send(JSON.stringify({
                        type: 'input_audio_buffer.append',
                        audio: base64Audio
                    }));
                    console.log('Audio chunk sent:', { type: 'input_audio_buffer.append', audio: base64Audio });
                    await new Promise(resolve => setTimeout(resolve, 5));
                }
                offset += this.CHUNK_SIZE;
            }

            if (offset < audioData.length) {
                this.pendingAudioData = audioData.slice(offset);
                console.log('Remaining audio data stored for next chunking:', this.pendingAudioData.length);
            }
        } catch (error) {
            console.error('Error processing audio buffer:', error);
            throw error;
        }
    }

    /**
     * **Convert Int16Array to Base64**
     * Encodes an Int16Array audio buffer into a base64 string.
     * @param int16Array - The Int16Array audio buffer.
     * @returns A base64-encoded string of the audio data.
     */
    private int16ArrayToBase64(int16Array: Int16Array): string {
        try {
            const buffer = new ArrayBuffer(int16Array.length * 2);
            const view = new DataView(buffer);
            
            for (let i = 0; i < int16Array.length; i++) {
                view.setInt16(i * 2, int16Array[i], true); // Little-endian
            }
            
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        } catch (error) {
            console.error('Error converting audio to base64:', error);
            throw error;
        }
    }

    /**
     * **Handle Reconnection Logic**
     * Attempts to reconnect the WebSocket with exponential backoff.
     */
    private async handleReconnect(): Promise<void> {
        if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
            console.warn('Max reconnection attempts reached');
            return;
        }

        const backoffTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;

        if (this.reconnectTimeout !== null) {
            clearTimeout(this.reconnectTimeout);
        }

        console.log(`Attempting to reconnect in ${backoffTime / 1000} seconds... (Attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);

        this.reconnectTimeout = window.setTimeout(() => {
            this.connect().catch(error => {
                console.error('Reconnection failed:', error);
            });
        }, backoffTime);
    }

    /**
     * **Disconnect from WebSocket**
     * Closes the WebSocket connection and cleans up all resources.
     */
    async disconnect(): Promise<void> {
        if (this.reconnectTimeout !== null) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        // Close WebSocket first
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            console.log('WebSocket connection closed');
        }

        this.isReady = false;
        this.messageQueue = [];
        this.pendingAudioData = null;

        // Clean up audio
        await this.cleanupAudio().catch(error => {
            console.warn('Error during audio cleanup on disconnect:', error);
        });

        this.onConnectionChange(false);
    }

    /**
     * **Cleanup Audio Resources**
     * Clears any queued audio buffers and closes the AudioContext.
     * @returns Promise that resolves when audio cleanup is complete
     */
    public async cleanupAudio(): Promise<void> {
        try {
            // Clear any pending audio
            this.audioBufferQueue = [];
            this.isPlaying = false;

            // Close AudioContext if it exists
            if (this.audioContext && this.audioContext.state !== 'closed') {
                await this.audioContext.close();
                this.audioContext = null;
                console.log('AudioContext closed');
            }

            // Reset any other audio state
            this.pendingAudioData = null;

            // Clear deduplication maps
            this.audioBufferMap.clear();
            this.processedTranscriptEvents.clear();
            this.processingAudioChunks.clear();

            console.log('Audio cleanup completed successfully');
        } catch (error) {
            console.error('Error during audio cleanup:', error);
            throw error; // Re-throw to allow caller to handle
        }
    }

    /**
     * **Check Connection Status**
     * @returns A boolean indicating whether the WebSocket is connected.
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN && this.isReady;
    }

    /**
     * **Get Ready State**
     * @returns The current ready state of the WebSocket.
     */
    getReadyState(): number {
        return this.ws?.readyState ?? WebSocket.CLOSED;
    }

    /**
     * **Generate Unique Chunk ID**
     * Generates a unique identifier for an audio chunk based on its content.
     * @param data - The base64-encoded audio chunk data.
     * @returns A unique string identifier for the chunk.
     */
    private generateChunkId(data: string): string {
        // Simple hash function for chunk identification
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `chunk_${hash}`;
    }

    /**
     * **Interrupt Audio Playback for a Specific Item**
     * Stops processing and playing audio for the specified item.
     * @param itemId - The identifier of the item to interrupt.
     */
    public async interruptAudio(itemId: string): Promise<void> {
        this.processingAudioChunks.add(itemId);

        // Remove any queued chunks for this item
        // Since audioBufferQueue is an array of Float32Array without item association,
        // additional logic is needed to associate buffers with itemIds.
        // For this implementation, assume each buffer is associated with a single item.
        // Modify this as per your actual queue structure.

        // Example: If audioBufferQueue was changed to store objects with itemId and buffer
        // Adjust accordingly based on your actual implementation.

        // For demonstration, we clear the entire queue for simplicity
        this.audioBufferQueue = this.audioBufferQueue.filter(() => false);
        console.log(`Audio playback interrupted and queue cleared for item ${itemId}`);

        // Cleanup buffers
        this.cleanupAudioBuffers(itemId);
    }

    /**
     * **Cleanup Audio Buffers for a Specific Item**
     * Removes tracking information for the specified item.
     * @param itemId - The identifier of the item to clean up.
     */
    private cleanupAudioBuffers(itemId: string): void {
        this.audioBufferMap.delete(itemId);
        this.processingAudioChunks.delete(itemId);
        console.log(`Audio buffers cleaned up for item ${itemId}`);
    }
}

export default EnhancedWebSocketHandler;
