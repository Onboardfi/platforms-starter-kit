//Users/bobbygilbert/Documents/Github/platforms-starter-kit/components/agent-console/index.tsx

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './Navbar';
import { TabContent } from './TabContent';
import { Footer } from './Footer';
import OnboardingProgressSidebar from '@/components/OnboardingProgressCard';
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from 'sonner';
import axios from 'axios';
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools';
import { WavRenderer } from '@/app/utils/wav_renderer';
import apiClient from '@/lib/api-client';
import PasswordAuthWrapper from '@/components/auth/PasswordAuthWrapper';
import { 
  AgentConsoleProps, 
  DraftEmail, 
  Session,
  WebSocketMessage,
  ConversationItem
} from './utils/types';
import EnhancedWebSocketHandler from '@/lib/websocket-handler';
import { 
  arrayBufferToBase64, 
  base64ToInt16Array,
  base64ToArrayBuffer 
} from '@/lib/utils/base64Utils';

/**
 * AgentConsole Component
 */
function AgentConsole({ agent }: AgentConsoleProps) {
    // UI State
    const [activeTab, setActiveTab] = useState('workspace');
    const [isRecording, setIsRecording] = useState(false);
    const [canPushToTalk, setCanPushToTalk] = useState(true);
    const [data, setData] = useState(agent);
    
    // Conversation State
    const [draftNote, setDraftNote] = useState<string | null>(null);
    const [draftEmail, setDraftEmail] = useState<DraftEmail | null>(null);
    const [isEditingDraft, setIsEditingDraft] = useState(false);
    const [isEditingEmail, setIsEditingEmail] = useState(false);

    // Session State
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('lastSessionId');
        }
        return null;
    });
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(false);

    // Step Completion State
    const [emailSent, setEmailSent] = useState(false);
    const [notesTaken, setNotesTaken] = useState(false);
    const [notionMessageSent, setNotionMessageSent] = useState(false);
    const [memoryKv, setMemoryKv] = useState<{ [key: string]: any }>({});

    // Conversation Items
    const [items, setItems] = useState<ConversationItem[]>([]);

    // Refs
    const wavRecorderRef = useRef<WavRecorder>(
        new WavRecorder({ sampleRate: 24000 }) // Ensure the constructor expects an options object
    );
    const wavStreamPlayerRef = useRef<WavStreamPlayer>(
        new WavStreamPlayer({ sampleRate: 24000 })
    );
    const clientCanvasRef = useRef<HTMLCanvasElement>(null);
    const serverCanvasRef = useRef<HTMLCanvasElement>(null);
    const startTimeRef = useRef<string>(new Date().toISOString());

    // WebSocket Handler Reference
    const wsHandler = useRef<EnhancedWebSocketHandler | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Listening indicator state
    const [isListening, setIsListening] = useState(false);

    // Ref to track the latest canPushToTalk value
    const canPushToTalkRef = useRef(canPushToTalk);

    useEffect(() => {
        canPushToTalkRef.current = canPushToTalk;
    }, [canPushToTalk]);

    /**
     * **Fetch Messages for a Conversation**
     */
    const fetchMessages = useCallback(async (conversationId: string) => {
        if (!conversationId || !agent.id) return;
        
        try {
            const response = await apiClient.get('/api/getConversationMessages', {
                params: { conversationId },
                headers: {
                    'x-agent-id': agent.id
                }
            });
            
            if (response.data.messages) {
                setItems(response.data.messages as ConversationItem[]);
            } else {
                // No messages yet is a valid state for a new conversation
                setItems([]);
            }
        } catch (error: any) {
            if (error.response?.status === 404) {
                // This is expected for new conversations
                setItems([]);
            } else {
                console.error('Failed to fetch messages:', error);
                toast.error('Failed to load messages');
            }
        }
    }, [agent.id]);

    /**
     * **Handle Audio Playback Errors**
     */
    const handleAudioError = useCallback(async (error: any) => {
        console.error('Audio playback error:', error);
        toast.error('Failed to play audio response');
        if (wavStreamPlayerRef.current?.interrupt) {
            try {
                await wavStreamPlayerRef.current.interrupt();
            } catch (interruptError) {
                console.error('Error interrupting stream:', interruptError);
            }
        }
    }, []);

    /**
     * **Send Message Function**
     * Sends a message through the WebSocket connection using EnhancedWebSocketHandler.
     */
 // Update the sendMessage function to handle null checks:
const sendMessage = useCallback((message: any) => {
    console.log('Attempting to send message:', message);
    if (!wsHandler.current) {
        console.warn('WebSocket handler not initialized');
        return;
    }

    if (wsHandler.current.isConnected()) {
        wsHandler.current.sendMessage(message);
    } else {
        console.warn('WebSocket is not connected. Queuing message:', message);
        wsHandler.current.sendMessage(message);
    }
}, []);


    /**
     * **Handle WebSocket Message**
     * Processes incoming WebSocket messages.
     */
    const handleWebSocketMessage = useCallback(async (data: WebSocketMessage) => {
        console.log('Received WebSocket message:', data);
        console.log('Current canPushToTalk:', canPushToTalkRef.current);
    
        switch (data.type) {
            // Session Events
            case 'session.created':
            case 'session.updated':
                console.log('Session updated:', data.session);
                break;
    
            // Conversation Events
            case 'conversation.created':
                if (data.conversation && data.conversation.id) {
                    console.log('Conversation created:', data.conversation.id);
                    fetchMessages(data.conversation.id);
                }
                break;
    
            case 'conversation.item.created':
                if (data.item) {
                    console.log('User message created:', data.item.id);
                    setItems((prevItems) => [...prevItems, data.item as ConversationItem]);
                }
                break;
    
            case 'conversation.item.truncated':
                if (data.item_id && data.audio_end_ms !== undefined) {
                    console.log(`Conversation item truncated: ${data.item_id} at ${data.audio_end_ms}ms`);
                    setItems((prevItems) =>
                        prevItems.map((item: ConversationItem) =>
                            item.id === data.item_id
                                ? {
                                    ...item,
                                    content: item.content.map((contentPart: any, index: number) =>
                                        index === data.content_index
                                            ? { ...contentPart, truncated: true, audio_end_ms: data.audio_end_ms }
                                            : contentPart
                                    ),
                                }
                                : item
                        )
                    );
                }
                break;
    
            case 'conversation.item.deleted':
                if (data.item_id) {
                    console.log('Conversation item deleted:', data.item_id);
                    setItems((prevItems) => prevItems.filter((item) => item.id !== data.item_id));
                }
                break;
    
            // Input Audio Buffer Events
            case 'input_audio_buffer.speech_started':
                if (!canPushToTalkRef.current) {
                    console.log('Speech started in perpetual mode. Setting isListening to true.');
                    setIsListening(true);
                } else {
                    console.log('Speech started in manual mode. Ignoring isListening.');
                }
                break;
    
            case 'input_audio_buffer.speech_stopped':
                if (!canPushToTalkRef.current) {
                    console.log('Speech stopped in perpetual mode. Setting isListening to false.');
                    setIsListening(false);
                } else {
                    console.log('Speech stopped in manual mode. Ignoring isListening.');
                }
                break;
    
            case 'input_audio_buffer.committed':
                if (data.item_id) {
                    console.log('Audio buffer committed:', data.item_id);
                    sendMessage({
                        type: 'response.create'
                    });
                }
                break;
    
            case 'input_audio_buffer.cleared':
                console.log('Audio buffer cleared');
                break;
    
            // Transcription Events
            case 'conversation.item.input_audio_transcription.completed':
                if (data.transcript && data.item_id) {
                    console.log(`Transcription completed for item ${data.item_id}: "${data.transcript.trim()}"`);
                    setItems((prevItems) =>
                        prevItems.map((item: ConversationItem) =>
                            item.id === data.item_id
                                ? {
                                    ...item,
                                    content: item.content.map((contentPart: any, index: number) =>
                                        index === data.content_index
                                            ? { ...contentPart, transcript: data.transcript.trim() }
                                            : contentPart
                                    ),
                                }
                                : item
                        )
                    );
                }
                break;
    
            case 'response.created':
                console.log('Response created:', data.response?.id);
                break;
    
            case 'response.done':
                if (data.response && data.response.output) {
                    console.log('Response done. Output items:', data.response.output.map((item: ConversationItem) => item.id));
                    setItems((prevItems) => [...prevItems, ...(data.response.output as ConversationItem[])]);
                }
                break;
    
            case 'response.output_item.added':
                if (data.item) {
                    console.log('Response output item added:', data.item.id);
                    setItems((prevItems) => [...prevItems, data.item as ConversationItem]);
                }
                break;
    
            case 'response.output_item.done':
                if (data.item) {
                    console.log('Response output item done:', data.item.id);
                    setItems((prevItems) =>
                        prevItems.map((item: ConversationItem) =>
                            item.id === data.item.id ? { ...data.item } : item
                        )
                    );
                }
                break;
    
            case 'response.text.delta':
                if (data.delta && data.item_id) {
                    console.log(`Response text delta for item ${data.item_id}: "${data.delta}"`);
                    setItems((prevItems) =>
                        prevItems.map((item: ConversationItem) =>
                            item.id === data.item_id
                                ? {
                                    ...item,
                                    content: item.content.map((contentPart: any, index: number) =>
                                        index === data.content_index
                                            ? { ...contentPart, text: (contentPart.text || '') + data.delta }
                                            : contentPart
                                    ),
                                }
                                : item
                        )
                    );
                }
                break;
    
            case 'response.text.done':
                if (data.text && data.item_id) {
                    console.log(`Response text done for item ${data.item_id}: "${data.text}"`);
                    setItems((prevItems) =>
                        prevItems.map((item: ConversationItem) =>
                            item.id === data.item_id
                                ? {
                                    ...item,
                                    content: item.content.map((contentPart: any, index: number) =>
                                        index === data.content_index
                                            ? { ...contentPart, text: data.text }
                                            : contentPart
                                    ),
                                }
                                : item
                        )
                    );
                }
                break;
    
            // Audio Events
            case 'response.audio.delta':
                try {
                    if (data.delta && data.item_id && wavStreamPlayerRef.current) {
                        console.log(`Response audio delta for item ${data.item_id}: Received audio chunk.`);
                        const audioData = base64ToInt16Array(data.delta);
                        wavStreamPlayerRef.current.add16BitPCM(audioData, data.item_id);
                    }
                } catch (error) {
                    console.error('Error processing audio delta:', error);
                    handleAudioError(error);
                }
                break;
    
            case 'response.audio.done':
                if (data.item_id) {
                    console.log('Audio track complete:', data.item_id);
                }
                break;
    
            // Additional Response Events
            case 'response.audio_transcript.delta':
            case 'response.audio_transcript.done':
            case 'response.content_part.done':
                console.log(`${data.type} received for item ${data.item_id}`);
                break;
    
            // Error Events
            case 'error':
                const errorMessage = data.error?.message || 'Unknown error';
                console.error('WebSocket error message:', errorMessage);
                if (!errorMessage.includes("Cannot update a conversation's voice") && 
                    errorMessage !== 'RealtimeAPI is not connected') {
                    toast.error(`WebSocket Error: ${errorMessage}`);
                }
                break;
    
            default:
                console.log('Received message of type:', data.type);
                break;
        }
    }, [fetchMessages, sendMessage, handleAudioError]);

    /**
     * **InitializeAudio Function**
     * Initializes audio recording and playback components.
     */
    const initializeAudio = useCallback(async () => {
      try {
          if (isRecording) {
              await wavRecorderRef.current.end();
              setIsRecording(false);
          }
  
          // Initialize stream player first for AI audio playback
          await wavStreamPlayerRef.current.interrupt(); // Ensure previous sessions are cleared
          await wavStreamPlayerRef.current.connect();
  
          // Then initialize recorder
          await wavRecorderRef.current.begin();
  
          return true;
      } catch (error) {
          console.error('Failed to initialize audio:', error);
          toast.error('Audio initialization failed');
          return false;
      }
  }, [isRecording]);

    /**
     * **Fetch Conversation History via REST API**
     */
    const fetchConversationHistory = useCallback(async (conversationId: string) => {
        try {
            const response = await apiClient.get('/api/getConversationMessages', {
                params: { 
                    conversationId
                },
                headers: {
                    'x-agent-id': agent.id
                }
            });
            setItems(response.data.messages || []);
        } catch (error) {
            console.error('Failed to fetch conversation history:', error);
            toast.error('Failed to load conversation history');
        }
    }, [agent.id]);

    /**
     * **Fetch Sessions**
     * Retrieves available sessions for the agent.
     */
    const fetchSessions = useCallback(async () => {
        if (!agent.id) return;
        
        try {
            setIsLoadingSessions(true);
            const response = await axios.get(`/api/getSessions?agentId=${agent.id}`);
            setSessions(response.data.sessions || []);
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
            toast.error('Failed to load sessions');
        } finally {
            setIsLoadingSessions(false);
        }
    }, [agent.id]);

    /**
     * **CleanupAudioAndWebSocket Utility Function**
     * Handles cleanup of audio and WebSocket connections.
     */
    const cleanupAudioAndWebSocket = useCallback(async () => {
        try {
            // Stop recording if active
            if (wavRecorderRef.current?.isRecording) {
                await wavRecorderRef.current.pause();
                setIsRecording(false);
            }

            // Clean up audio players in sequence
            try {
                // Stop any playing audio first
                await wavStreamPlayerRef.current?.interrupt();
                
                // Then clean up recorder
                if (wavRecorderRef.current) {
                    await wavRecorderRef.current.end();
                }
            } catch (e) {
                console.warn('Error during audio cleanup:', e);
            }

            // Finally disconnect WebSocket
            if (wsHandler.current) {
                await wsHandler.current.cleanupAudio(); // Ensure audio is cleaned up
                wsHandler.current.disconnect();
                wsHandler.current = null;
            }

            setIsConnected(false);
        } catch (error) {
            console.error('Error during cleanup:', error);
            setIsConnected(false);
            throw error;
        }
    }, []);

    /**
     * **Disconnect Conversation**
     * Disconnects the conversation by cleaning up audio and WebSocket connections.
     */
    const disconnectConversation = useCallback(async () => {
        try {
            await cleanupAudioAndWebSocket();
            toast.success('Disconnected successfully');
        } catch (error) {
            console.error('Error during disconnect:', error);
            toast.error('Failed to disconnect cleanly');
        }
    }, [cleanupAudioAndWebSocket]);

    /**
     * **Create New Session**
     * Creates a new session and an initial conversation for the agent.
     */
    const createNewSession = useCallback(async () => {
      if (!agent.id) return null;
      
      try {
          // Clean up any existing audio before creating new session
          if (wavStreamPlayerRef.current) {
              await wavStreamPlayerRef.current.interrupt();
          }
          if (wsHandler.current) {
              await wsHandler.current.cleanupAudio();
          }

          // First create the session
          const sessionResponse = await apiClient.post('/api/createSession', {
              name: `Session ${new Date().toLocaleString()}`,
              type: data.settings?.onboardingType || 'internal',
              agentId: agent.id
          }, {
              headers: {
                  'x-agent-id': agent.id,
                  'Content-Type': 'application/json'
              }
          });
          
          if (sessionResponse.data.error) {
              throw new Error(sessionResponse.data.error);
          }

          const sessionId = sessionResponse.data.sessionId;

          // Then create an initial conversation for this session
          const conversationResponse = await apiClient.post('/api/getOrCreateConversation', {
              sessionId,
              agentId: agent.id
          }, {
              headers: {
                  'x-agent-id': agent.id,
                  'Content-Type': 'application/json'
              }
          });

          if (conversationResponse.data.error) {
              throw new Error(conversationResponse.data.error);
          }

          const conversationId = conversationResponse.data.conversationId;
          
          // Reset states and save session ID
          setCurrentSessionId(sessionId);
          localStorage.setItem('lastSessionId', sessionId);
          setEmailSent(false);
          setNotesTaken(false);
          setNotionMessageSent(false);
          setMemoryKv({});
          setItems([]);
          
          // Initialize audio
          const audioInitialized = await initializeAudio();
          if (!audioInitialized) {
              throw new Error('Audio initialization failed');
          }
          
          // Initialize WebSocket connection with session configuration
          if (wsHandler.current?.isConnected()) {
              await wsHandler.current.sendMessage({
                  type: 'session.update',
                  session: {
                      modalities: ['text', 'audio'],
                      instructions: "Your knowledge cutoff is 2023-10. You are a helpful assistant.",
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
                      tools: [
                          {
                              type: "function",
                              name: "get_weather",
                              description: "Get the current weather for a location.",
                              parameters: {
                                  type: "object",
                                  properties: {
                                      location: { type: "string" }
                                  },
                                  required: ["location"]
                              }
                          }
                      ],
                      tool_choice: "auto",
                      temperature: 0.8,
                      max_response_output_tokens: 4000 // Changed from "inf" to 4000
                  }
              });
          }
          
          toast.success('New session created');
          await fetchSessions();

          // Now fetch messages for the new conversation
          await fetchMessages(conversationId);
          
          return sessionId;
      } catch (error) {
          console.error('Failed to create session:', error);
          toast.error('Failed to create session');
          return null;
      }
    }, [agent.id, data.settings?.onboardingType, fetchSessions, initializeAudio, fetchMessages]);

    /**
     * **Load Session State**
     * Loads the state of a selected session and fetches its messages.
     */
    const loadSessionState = useCallback(async (sessionId: string) => {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;
    
      try {
          // Clean up existing audio state
          if (wavStreamPlayerRef.current) {
              await wavStreamPlayerRef.current.interrupt();
          }
          if (wsHandler.current) {
              await wsHandler.current.cleanupAudio();
          }
  
          // Get or create conversation for this session
          const conversationResponse = await apiClient.post('/api/getOrCreateConversation', {
              sessionId,
              agentId: agent.id
          }, {
              headers: {
                  'x-agent-id': agent.id
              }
          });

          if (conversationResponse.data.error) {
              throw new Error(conversationResponse.data.error);
          }

          const conversationId = conversationResponse.data.conversationId;

          // Only send voice settings if this is a new conversation
          if (!conversationResponse.data.existingConversation) {
              // Send session config...
              if (wsHandler.current?.isConnected()) {
                  await wsHandler.current.sendMessage({
                      type: 'session.update',
                      session: {
                          modalities: ['text', 'audio'],
                          instructions: "Your knowledge cutoff is 2023-10. You are a helpful assistant.",
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
                          tools: [
                              {
                                  type: "function",
                                  name: "get_weather",
                                  description: "Get the current weather for a location.",
                                  parameters: {
                                      type: "object",
                                      properties: {
                                          location: { type: "string" }
                                      },
                                      required: ["location"]
                                  }
                              }
                          ],
                          tool_choice: "auto",
                          temperature: 0.8,
                          max_response_output_tokens: 4000 // Changed from "inf" to 4000
                      }
                  });
              }
          }

          // Reset states
          setEmailSent(false);
          setNotesTaken(false);
          setNotionMessageSent(false);
          setMemoryKv({});

          // Update based on session progress
          session.stepProgress?.steps?.forEach(step => {
              if (step.completed) {
                  switch (step.completionTool) {
                      case 'email':
                          setEmailSent(true);
                          break;
                      case 'notesTaken':
                          setNotesTaken(true);
                          break;
                      case 'notion':
                          setNotionMessageSent(true);
                          break;
                  }
              }
          });

          // Fetch messages for this conversation
          await fetchMessages(conversationId);
      } catch (error) {
          console.error('Failed to load session state:', error);
          toast.error('Failed to load session state');
      }
    }, [sessions, agent.id, fetchMessages]);

    /**
     * **Handle Session Selection**
     * Handles the selection of a session from the sidebar.
     */
    const handleSessionSelect = useCallback(async (sessionId: string) => {
        try {
            setCurrentSessionId(sessionId);
            localStorage.setItem('lastSessionId', sessionId);
            await loadSessionState(sessionId);
        } catch (error) {
            console.error('Failed to switch session:', error);
            toast.error('Failed to switch session');
        }
    }, [loadSessionState]);

    /**
     * **Step Completion Management**
     * Updates the completion status of a step.
     */
    const updateStepStatus = useCallback(async (completionTool: string) => {
        if (!currentSessionId) {
            console.warn('No active session for step update');
            return;
        }

        try {
            await axios.post('/api/updateSessionSteps', {
                agentId: agent.id,
                sessionId: currentSessionId,
                completionTool,
                completed: true
            });

            // Update local state based on tool
            switch (completionTool) {
                case 'email':
                    setEmailSent(true);
                    break;
                case 'notesTaken':
                    setNotesTaken(true);
                    break;
                case 'notion':
                    setNotionMessageSent(true);
                    break;
            }

            await fetchSessions();
        } catch (error) {
            console.error('Failed to update step:', error);
            toast.error('Failed to update step completion');
        }
    }, [currentSessionId, agent.id, fetchSessions]);

    /**
     * **Recording Handlers**
     * Handles the start and stop of audio recording.
     */
    const stopRecording = useCallback(async () => {
      if (!isRecording) return;
      
      try {
          // Only stop the recording
          await wavRecorderRef.current.pause();
          setIsRecording(false);
          
          // Just commit the audio buffer
          sendMessage({
              type: 'input_audio_buffer.commit'
          });
          
      } catch (error) {
          console.error('Failed to stop recording:', error);
          toast.error('Failed to stop recording');
          await initializeAudio();
      }
  }, [isRecording, initializeAudio, sendMessage]);

    const startRecording = useCallback(async () => {
        try {
            if (isRecording) {
                console.warn('Already recording, stopping first...');
                await stopRecording();
                return;
            }

            if (!wavRecorderRef.current.processor) {
                const audioInitialized = await initializeAudio();
                if (!audioInitialized) return;
            }
            
            setIsRecording(true);
            await wavRecorderRef.current.record((data: { mono: Int16Array; raw: Int16Array; }) => {
              if (!data?.mono) {
                  console.warn('Invalid audio data received');
                  return;
              }
          
              if (wsHandler.current?.isConnected()) {
                  wsHandler.current.sendMessage({
                      type: 'input_audio_buffer.append',
                      audio: data.mono // Already an Int16Array, no need to convert
                  });
              }
          });
          
        } catch (error) {
            console.error('Failed to start recording:', error);
            toast.error('Failed to start recording');
            setIsRecording(false);
        }
    }, [initializeAudio, isRecording, stopRecording]);

    /**
     * **Connect Conversation Function**
     * Connects the conversation by establishing WebSocket and audio connections.
     */
 // In connectConversation function:
const connectConversation = useCallback(async () => {
    try {
        // Clean up any existing connections first
        await cleanupAudioAndWebSocket();

        // Create new WebSocket handler using getInstance
        wsHandler.current = EnhancedWebSocketHandler.getInstance(
            'ws://localhost:8081', // Use secure WebSocket (wss://) in production
            agent.id,
            handleWebSocketMessage,
            setIsConnected
        );

        // Safely connect using optional chaining and null checks
        if (!wsHandler.current) {
            throw new Error('Failed to initialize WebSocket handler');
        }

        // Await the WebSocket connection
        await wsHandler.current.connect();

        // Initialize stream player first for AI audio playback
        await wavStreamPlayerRef.current?.interrupt(); // Ensure previous sessions are cleared
        await wavStreamPlayerRef.current.connect();

        // Then initialize recorder
        await wavRecorderRef.current.begin();

        if (currentSessionId && wsHandler.current) {
            // Get or create conversation for this session
            const conversationResponse = await apiClient.post('/api/getOrCreateConversation', {
                sessionId: currentSessionId,
                agentId: agent.id
            }, {
                headers: {
                    'x-agent-id': agent.id
                }
            });

            if (conversationResponse.data.error) {
                throw new Error(conversationResponse.data.error);
            }

            const conversationId = conversationResponse.data.conversationId;

            // Only send voice settings if this is a new conversation
            if (!conversationResponse.data.existingConversation) {
                // Use type assertion to ensure wsHandler.current is not null
                const ws = wsHandler.current;
                await ws.sendMessage({
                    type: 'session.update',
                    session: {
                        modalities: ['text', 'audio'],
                        instructions: "Your knowledge cutoff is 2023-10. You are a helpful assistant.",
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
                        tools: [
                            {
                                type: "function",
                                name: "get_weather",
                                description: "Get the current weather for a location.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        location: { type: "string" }
                                    },
                                    required: ["location"]
                                }
                            }
                        ],
                        tool_choice: "auto",
                        temperature: 0.8,
                        max_response_output_tokens: 4000
                    }
                });
            }

            // Fetch any existing messages
            await fetchMessages(conversationId);
        }

        toast.success('Connected successfully');
    } catch (error) {
        console.error('Connection failed:', error);
        toast.error('Failed to connect conversation');
        // Clean up on error
        await cleanupAudioAndWebSocket();
    }
}, [
    agent.id, 
    currentSessionId, 
    cleanupAudioAndWebSocket, 
    handleWebSocketMessage,
    fetchMessages
]);


    /**
     * **Draft Handlers**
     * Handles sending notes and emails.
     */
    const handleSendNote = useCallback(async () => {
        if (!draftNote || !currentSessionId) return;
        
        try {
            await axios.post('/api/addMessageToNotion', { 
                messageContent: draftNote,
                sessionId: currentSessionId 
            });
            
            setNotesTaken(true);
            setNotionMessageSent(true);
            setDraftNote(null);

            toast.success('Note successfully sent to Notion!');
            await updateStepStatus('notion');
        } catch (err) {
            console.error('Error in add_notion_message:', err);
            toast.error('Failed to add note to Notion.');
        }
    }, [draftNote, currentSessionId, updateStepStatus]);

    const handleSendEmail = useCallback(async () => {
        if (!draftEmail || !currentSessionId) return;
        
        try {
            await axios.post('/api/send_email', { 
                ...draftEmail,
                sessionId: currentSessionId 
            });
            
            setEmailSent(true);
            setDraftEmail(null);

            toast.success('Email successfully sent!');
            await updateStepStatus('email');
        } catch (err) {
            console.error('Error in send_email:', err);
            toast.error('Failed to send email.');
        }
    }, [draftEmail, currentSessionId, updateStepStatus]);

    /**
     * **Audio Visualization Effect**
     * Renders audio visualization on canvas elements.
     */
    useEffect(() => {
        let isLoaded = true;
        const wavRecorder = wavRecorderRef.current;
        const wavStreamPlayer = wavStreamPlayerRef.current;

        const render = () => {
            if (!isLoaded) return;

            // Client canvas rendering
            if (clientCanvasRef.current) {
                const canvas = clientCanvasRef.current;
                const ctx = canvas.getContext('2d');

                if (!canvas.width || !canvas.height) {
                    canvas.width = canvas.offsetWidth;
                    canvas.height = canvas.offsetHeight;
                }

                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    const result = isRecording
                        ? wavRecorder.getFrequencies('voice')
                        : { values: new Float32Array([0]) };
                    
                    WavRenderer.drawBars(
                        canvas,
                        ctx,
                        result.values,
                        data.settings?.primaryColor || "#3b82f6",
                        10,
                        0,
                        8
                    );
                }
            }

            // Server canvas rendering
            if (serverCanvasRef.current) {
                const canvas = serverCanvasRef.current;
                const ctx = canvas.getContext('2d');

                if (!canvas.width || !canvas.height) {
                    canvas.width = canvas.offsetWidth;
                    canvas.height = canvas.offsetHeight;
                }

                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    const result = wavStreamPlayer.analyser
                        ? wavStreamPlayer.getFrequencies('voice')
                        : { values: new Float32Array([0]) };
                    
                    WavRenderer.drawBars(
                        canvas,
                        ctx,
                        result.values,
                        data.settings?.secondaryColor || "#10b981",
                        10,
                        0,
                        8
                    );
                }
            }

            requestAnimationFrame(render);
        };

        render();
        return () => { isLoaded = false; };
    }, [data.settings?.primaryColor, data.settings?.secondaryColor, isRecording]);

    /**
     * **Initial Setup Effects**
     * Fetches sessions on component mount and loads session state if available.
     */
    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    useEffect(() => {
        if (currentSessionId) {
            loadSessionState(currentSessionId);
        }
    }, [currentSessionId, loadSessionState]);

    /**
     * **Cleanup Effect**
     * Ensures audio sessions are properly terminated on component unmount.
     */
    useEffect(() => {
        return () => {
            // Cleanup function
            const cleanup = async () => {
                try {
                    await cleanupAudioAndWebSocket();
                } catch (error) {
                    console.error('Cleanup error:', error);
                }
            };
            cleanup();
        };
    }, [cleanupAudioAndWebSocket]);

    /**
     * **Reset isListening When Switching to Manual Mode**
     */
    useEffect(() => {
        if (canPushToTalk) {
            setIsListening(false);
        }
    }, [canPushToTalk]);

    /**
     * **JSX Return**
     */
    return (
        <PasswordAuthWrapper 
            agentId={agent.id}
            siteName={agent.name || "Internal Onboarding"}
            authMessage={agent.settings?.authentication?.message || undefined}
        >
            <TooltipProvider>
                <div className="min-h-screen bg-gray-1100 bg-[url('/grid.svg')]">
                    {/* Sidebar */}
                    <div className="fixed left-0 top-0 bottom-0 w-96 border-r border-gray-800 bg-black overflow-y-auto">
                        <div className="flex-1 flex flex-col">
                            <OnboardingProgressSidebar
                                emailSent={emailSent}
                                notesTaken={notesTaken}
                                notionMessageSent={notionMessageSent}
                                memoryKv={memoryKv}
                                steps={data.settings?.steps || []}
                                title={data.name || undefined}
                                logo={data.site?.logo || null}
                                availableTools={data.settings?.tools || []}
                                agentId={data.id}
                                onStepsUpdated={fetchSessions}
                                primaryColor={data.settings?.primaryColor || "#3b82f6"}
                                secondaryColor={data.settings?.secondaryColor || "#10b981"}
                                currentSessionId={currentSessionId}
                            />
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="ml-96 min-h-screen flex flex-col">
                        <Navbar
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            primaryColor={data.settings?.primaryColor || '#7928CA'}
                            secondaryColor={data.settings?.secondaryColor || '#FF0080'}
                        />
                        <TabContent
                            activeTab={activeTab}
                            agentId={agent.id}
                            items={items}
                            draftNote={draftNote}
                            draftEmail={draftEmail}
                            isEditingDraft={isEditingDraft}
                            isEditingEmail={isEditingEmail}
                            handleEditDraft={() => setIsEditingDraft(true)}
                            handleEditEmail={() => setIsEditingEmail(true)}
                            handleSaveDraft={(draft: string) => {
                                setDraftNote(draft);
                                setIsEditingDraft(false);
                            }}
                            handleSaveEmail={(email: DraftEmail) => {
                                setDraftEmail(email);
                                setIsEditingEmail(false);
                            }}
                            handleSendNote={handleSendNote}
                            handleSendEmail={handleSendEmail}
                            setDraftNote={setDraftNote}
                            setDraftEmail={setDraftEmail}
                            sessions={sessions}
                            isLoadingSessions={isLoadingSessions}
                            createNewSession={createNewSession}
                            currentSessionId={currentSessionId}
                            onSessionSelect={handleSessionSelect}
                            primaryColor={data.settings?.primaryColor || '#7928CA'}
                            secondaryColor={data.settings?.secondaryColor || '#FF0080'}
                        />

                        <Footer
                            isConnected={isConnected}
                            isRecording={isRecording}
                            canPushToTalk={canPushToTalk}
                            connectConversation={connectConversation}
                            disconnectConversation={disconnectConversation}
                            startRecording={startRecording}
                            stopRecording={stopRecording}
                            changeTurnEndType={(value: string) => setCanPushToTalk(value === 'none')}
                            clientCanvasRef={clientCanvasRef}
                            serverCanvasRef={serverCanvasRef}
                            wavRecorder={wavRecorderRef.current!}
                            wavStreamPlayer={wavStreamPlayerRef.current!}
                            primaryColor={data.settings?.primaryColor}
                            secondaryColor={data.settings?.secondaryColor}
                            isListening={isListening} // Pass the listening state
                        />
                    </div>
                </div>
            </TooltipProvider>
        </PasswordAuthWrapper>
    );

}

export default AgentConsole;