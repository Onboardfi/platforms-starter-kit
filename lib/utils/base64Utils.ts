/**
 * Base64 utility functions for audio data handling
 */

/**
 * Converts an ArrayBuffer to a Base64 string.
 * @param buffer The ArrayBuffer to convert.
 * @returns The Base64 encoded string.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const chunks: string[] = [];
    const chunkSize = 0x8000; // Process in chunks to handle large buffers

    // Process the buffer in chunks to avoid call stack limits
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
    }

    return btoa(chunks.join(''));
}

/**
 * Converts a Base64 string to an Int16Array for audio processing.
 * Properly handles 16-bit PCM audio data.
 * @param base64 The Base64 string to convert.
 * @returns The resulting Int16Array containing audio samples.
 */
export function base64ToInt16Array(base64: string): Int16Array {
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
        validateAudioSamples(samples);

        return samples;
    } catch (error) {
        console.error('Error converting base64 to Int16Array:', error);
        throw new Error('Failed to convert audio data');
    }
}

/**
 * Converts a Base64 string to an ArrayBuffer.
 * @param base64 The Base64 string to convert.
 * @returns The resulting ArrayBuffer.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    try {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);

        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return bytes.buffer;
    } catch (error) {
        console.error('Error converting base64 to ArrayBuffer:', error);
        throw new Error('Failed to convert data to ArrayBuffer');
    }
}

/**
 * Validates audio samples to ensure they're within the correct range for 16-bit PCM.
 * @param samples The Int16Array containing audio samples to validate.
 * @throws Error if samples are invalid.
 */
function validateAudioSamples(samples: Int16Array): void {
    if (samples.length === 0) {
        throw new Error('Empty audio sample buffer');
    }

    // Check the first few samples to ensure they're within valid range
    // Don't check every sample for performance reasons
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
 * Creates an empty audio buffer of specified length.
 * @param length The number of samples needed.
 * @returns An Int16Array filled with zeros.
 */
export function createEmptyAudioBuffer(length: number): Int16Array {
    return new Int16Array(length);
}

/**
 * Combines multiple audio buffers into a single buffer.
 * @param buffers Array of Int16Arrays to combine.
 * @returns Combined Int16Array.
 */
export function combineAudioBuffers(buffers: Int16Array[]): Int16Array {
    // Calculate total length
    const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
    
    // Create new buffer
    const result = new Int16Array(totalLength);
    
    // Copy all buffers
    let offset = 0;
    for (const buffer of buffers) {
        result.set(buffer, offset);
        offset += buffer.length;
    }
    
    return result;
}

/**
 * Converts a standard array to Int16Array for audio processing.
 * @param array Array of numbers to convert.
 * @returns Int16Array suitable for audio processing.
 */
export function arrayToInt16Array(array: number[]): Int16Array {
    const int16Array = new Int16Array(array.length);
    for (let i = 0; i < array.length; i++) {
        // Clamp values to 16-bit range
        int16Array[i] = Math.max(-32768, Math.min(32767, Math.round(array[i])));
    }
    return int16Array;
}