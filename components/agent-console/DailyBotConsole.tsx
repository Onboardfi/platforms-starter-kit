// /Users/bobbygilbert/Documents/GitHub/platforms-starter-kit/components/agent-console/DailyBotConsole.tsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DailyTransport } from '@daily-co/realtime-ai-daily';
import { RTVIClient, LLMHelper, RTVIEvent, RTVIClientConfigOption } from 'realtime-ai';
import { RTVIClientProvider, useRTVIClientEvent } from 'realtime-ai-react';
import { toast } from 'sonner';
import { Site } from '@/types/agent';
import { getDailyBotHeaders } from '@/lib/utils/headers';

// Types
interface DailyBotMessage {
  type: 'bot_speaking_started'
       | 'bot_speaking_stopped'
       | 'daily_bot_connected'
       | 'daily_bot_disconnected';
  timestamp: string;
  data?: any;
}

interface RTVIError {
  code?: string;
  message: string;
  details?: Record<string, any>;
}

interface DailyBotConsoleProps {
  agent: {
    id: string;
    name?: string | null;
    description?: string | null;
    image?: string | null;
    imageBlurhash?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    slug?: string;
    createdBy?: string | null;
    published?: boolean;
    siteId?: string | null;
    site?: Site;
    settings: {
      useDailyBot?: boolean;
      dailyBot?: {
        botProfile: string;
        maxDuration: number;
        services: {
          llm: string;
          tts: string;
          stt: string;
        };
        voice: {
          model: string;
          voice: string;
          language: string;
        };
      };
      initialMessage?: string;
      onboardingType?: 'internal' | 'external';
      authentication?: {
        enabled: boolean;
        password?: string;
        message?: string;
      };
    };
    creator?: {
      id: string;
      name: string | null;
      username: string | null;
      gh_username: string | null;
      email: string;
      emailVerified: Date | null;
      image: string | null;
      stripeCustomerId: string | null;
      stripeSubscriptionId: string | null;
      metadata: Record<string, any>;
      createdAt: Date;
      updatedAt: Date;
    };
  };
  onMessage: (message: DailyBotMessage) => void;
  onError: (error: Error) => void;
}

// Default configurations
const DEFAULT_VOICE_CONFIG = {
  model: 'sonic-english',
  voice: '79a125e8-cd45-4c13-8a67-188112f4dd22',
  language: 'en',
} as const;

const DEFAULT_SERVICES = {
  llm: 'anthropic',
  tts: 'cartesia',
  stt: 'deepgram',
} as const;

// Helper functions
const checkApiConfig = async (agentId: string) => {
  try {
    // Use your existing debug endpoint
    const response = await fetch('/api/daily-bot/debug', {
      headers: getDailyBotHeaders(agentId),
    });
    if (!response.ok) {
      throw new Error('Failed to check API configuration');
    }
    const config = await response.json();
    return config;
  } catch (error) {
    console.error('Config check failed:', error);
    return { hasUrl: false, hasApiKey: false };
  }
};

const handleDailyBotError = async (
  error: Error | unknown,
  agentId: string
): Promise<Error> => {
  // Confirm environment config
  const config = await checkApiConfig(agentId);
  if (!config.hasUrl || !config.hasApiKey) {
    return new Error(
      'Daily Bot is not properly configured. Please check your environment variables.'
    );
  }

  // Return more specific error messages
  if (error instanceof Error) {
    if (
      error.message.includes('DAILY_BOTS_URL') ||
      error.message.includes('DAILY_BOTS_API_KEY')
    ) {
      return new Error(
        'Daily Bot API configuration is missing. Please check your environment variables.'
      );
    }
    if (error.message.includes('Failed to fetch')) {
      return new Error(
        'Failed to connect to Daily Bot API. Please check your internet connection.'
      );
    }
    return error;
  }

  return new Error('An unknown error occurred while connecting to Daily Bot');
};

const DailyBotConsole: React.FC<DailyBotConsoleProps> = ({
  agent,
  onMessage,
  onError,
}) => {
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Refs
  const voiceClientRef = useRef<RTVIClient | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  // Initialize Daily Bot client
  useEffect(() => {
    if (!agent.settings?.useDailyBot || voiceClientRef.current || isInitializing) {
      return;
    }

    const initializeClient = async () => {
      setIsInitializing(true);
      setHasError(false);

      try {
        // Check environment config
        const envConfig = await checkApiConfig(agent.id);
        if (!envConfig.hasUrl || !envConfig.hasApiKey) {
          throw new Error('Daily Bot configuration is incomplete');
        }

        // Merge default voice settings if some are missing
        const voiceSettings =
          agent.settings.dailyBot?.voice || DEFAULT_VOICE_CONFIG;
        const serviceSettings =
          agent.settings.dailyBot?.services || DEFAULT_SERVICES;

        // Build Realtime AI config options
        const botConfig: RTVIClientConfigOption[] = [
          {
            service: 'tts',
            options: [
              { name: 'model', value: voiceSettings.model },
              { name: 'voice', value: voiceSettings.voice },
              { name: 'language', value: voiceSettings.language },
            ],
          },
          {
            service: 'llm',
            options: [
              {
                name: 'initial_messages',
                value: [
                  {
                    role: 'system',
                    content:
                      agent.settings.initialMessage ||
                      'I am a helpful assistant.',
                  },
                ],
              },
              { name: 'temperature', value: 0.7 },
              { name: 'max_tokens', value: 2000 },
            ],
          },
          {
            service: 'stt',
            options: [
              { name: 'language', value: voiceSettings.language },
              { name: 'model', value: 'nova-2-general' },
            ],
          },
        ];

        // No custom fetch or fetchOptions—just a plain DailyTransport
        const transport = new DailyTransport();

        // Instantiate the voice client
        const voiceClient = new RTVIClient({
          transport,
          params: {
            baseUrl: '/api/daily-bot',
            // <--- Pass agentId in the "requestData" object
            requestData: {
              agentId: agent.id, // The server can read it from body.requestData.agentId
              services: {
                llm: serviceSettings.llm,
                tts: serviceSettings.tts,
                stt: serviceSettings.stt,
              },
              config: botConfig,
              // Additional metadata if needed
              settings: {
                voiceSettings,
                maxDuration: agent.settings.dailyBot?.maxDuration || 600,
              },
            },
          },
          // Timeout in milliseconds
          timeout: (agent.settings.dailyBot?.maxDuration || 600) * 1000,
        });

        // Attach LLM helper
        const llmHelper = new LLMHelper({});
        voiceClient.registerHelper('llm', llmHelper);

        // Save reference
        voiceClientRef.current = voiceClient;
      } catch (err) {
        setHasError(true);
        const handledError = await handleDailyBotError(err, agent.id);
        console.error('Failed to initialize Daily Bot:', handledError);
        onError(handledError);
        toast.error('Failed to initialize Daily Bot');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeClient();

    // Cleanup on unmount
    return () => {
      if (voiceClientRef.current) {
        voiceClientRef.current.disconnect();
        voiceClientRef.current = null;
      }
      reconnectAttempts.current = 0;
    };
  }, [
    agent.settings?.useDailyBot,
    agent.settings?.dailyBot,
    agent.settings?.initialMessage,
    isInitializing,
    onError,
    agent.id,
  ]);

  /** Event handlers **/

  // Bot started speaking
  useRTVIClientEvent(
    RTVIEvent.BotStartedSpeaking,
    useCallback(() => {
      onMessage({
        type: 'bot_speaking_started',
        timestamp: new Date().toISOString(),
      });
    }, [onMessage])
  );

  // Bot stopped speaking
  useRTVIClientEvent(
    RTVIEvent.BotStoppedSpeaking,
    useCallback(() => {
      onMessage({
        type: 'bot_speaking_stopped',
        timestamp: new Date().toISOString(),
      });
    }, [onMessage])
  );

  // User started speaking
  useRTVIClientEvent(
    RTVIEvent.UserStartedSpeaking,
    useCallback(() => {
      setIsRecording(true);
    }, [])
  );

  // User stopped speaking
  useRTVIClientEvent(
    RTVIEvent.UserStoppedSpeaking,
    useCallback(() => {
      setIsRecording(false);
    }, [])
  );

  // Disconnected
  useRTVIClientEvent(
    RTVIEvent.Disconnected,
    useCallback(
      async (error: RTVIError | null) => {
        if (error) {
          console.error('Daily Bot WebSocket error:', error);
          const handledError = await handleDailyBotError(error, agent.id);
          onError(handledError);
          toast.error(handledError.message);
        }
      },
      [onError, agent.id]
    )
  );

  /** Connection handlers **/

  // Connect
  const connect = useCallback(async () => {
    try {
      if (!voiceClientRef.current) {
        throw new Error('Daily Bot client not initialized');
      }

      await voiceClientRef.current.connect();
      setIsConnected(true);
      reconnectAttempts.current = 0;

      onMessage({
        type: 'daily_bot_connected',
        timestamp: new Date().toISOString(),
      });

      toast.success('Connected to Daily Bot');
    } catch (error) {
      const handledError = await handleDailyBotError(error, agent.id);
      console.error('Failed to connect Daily Bot:', handledError);
      onError(handledError);
      toast.error(handledError.message);

      // Simple reconnect attempt
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        toast.info(
          `Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})`
        );
        setTimeout(connect, 2000);
      }
    }
  }, [onMessage, onError, agent.id]);

  // Disconnect
  const disconnect = useCallback(async () => {
    try {
      if (voiceClientRef.current) {
        await voiceClientRef.current.disconnect();
        setIsConnected(false);

        onMessage({
          type: 'daily_bot_disconnected',
          timestamp: new Date().toISOString(),
        });

        toast.success('Disconnected from Daily Bot');
      }
    } catch (error) {
      const handledError = await handleDailyBotError(error, agent.id);
      console.error('Failed to disconnect Daily Bot:', handledError);
      onError(handledError);
      toast.error('Failed to disconnect cleanly');
    }
  }, [onMessage, onError, agent.id]);

  // Toggle Recording
  const toggleRecording = useCallback(() => {
    if (!isConnected || !voiceClientRef.current) return;

    try {
      if (isRecording) {
        // stop mic
        voiceClientRef.current.enableMic(false);
        setIsRecording(false);
      } else {
        // start mic
        voiceClientRef.current.enableMic(true);
        setIsRecording(true);
      }
    } catch (error) {
      console.error('Failed to toggle recording:', error);
      onError(error instanceof Error ? error : new Error('Failed to toggle recording'));
      toast.error('Failed to toggle recording');
    }
  }, [isConnected, isRecording, onError]);

  /** Render **/
  return (
    <>
      {voiceClientRef.current && (
        <RTVIClientProvider client={voiceClientRef.current}>
          <div className="daily-bot-controls flex items-center justify-center space-x-4 p-4">
            {agent.settings?.useDailyBot ? (
              <>
                <button
                  onClick={isConnected ? disconnect : connect}
                  disabled={isInitializing || hasError}
                  className={`
                    px-4 py-2 rounded-xl font-medium
                    ${
                      isInitializing
                        ? 'bg-gray-400'
                        : hasError
                        ? 'bg-red-300'
                        : isConnected
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-green-500 hover:bg-green-600'
                    }
                    text-white transition-colors duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {isInitializing
                    ? 'Initializing...'
                    : hasError
                    ? 'Configuration Error'
                    : isConnected
                    ? 'Disconnect'
                    : 'Connect'}{' '}
                  Daily Bot
                </button>

                {isConnected && (
                  <button
                    onClick={toggleRecording}
                    className={`
                      px-4 py-2 rounded-xl font-medium
                      ${
                        isRecording
                          ? 'bg-red-400 hover:bg-red-500'
                          : 'bg-blue-400 hover:bg-blue-500'
                      }
                      text-white transition-colors duration-200
                    `}
                  >
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                  </button>
                )}
              </>
            ) : null}
          </div>
        </RTVIClientProvider>
      )}

      {!voiceClientRef.current && agent.settings?.useDailyBot && (
        <div className="daily-bot-controls flex items-center justify-center space-x-4 p-4">
          <div className="text-gray-500">Initializing Daily Bot...</div>
        </div>
      )}
    </>
  );
};

export default DailyBotConsole;
