"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAgent } from "@/app/contexts/AgentContext";
import { DailyTransport, DailyTransportConstructorOptions } from "@pipecat-ai/daily-transport";
import { DailyVoiceClient } from "realtime-ai-daily";
import {
  RTVIClientAudio,
  RTVIClientProvider,
  useRTVIClientEvent,
} from "realtime-ai-react";
import {
  TransportState,
  RTVIEvent,
  RTVIError,
  RTVIClientHelper,
  Transport,
  RTVIClientOptions,
  FunctionCallParams
} from "realtime-ai"; // Changed to realtime-ai
import { LLMHelper as ClientLLMHelper } from "realtime-ai"; // Changed to realtime-ai
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { DailyBotApp } from "@/components/daily-bot/DailyBotApp";
import { NotFound } from "@/components/shared/not-found";
import Header from "@/components/Header";

const BOT_READY_TIMEOUT = 15 * 1000;

// Ensure LLMHelper extends and implements from the same module
class LLMHelper extends ClientLLMHelper implements RTVIClientHelper {
  constructor(options: any) {
    super(options);
  }

  handleMessage(ev: any): void {
    // Implement the required method
  }

  getMessageTypes(): string[] {
    return []; // Implement accordingly
  }
}

export default function VoicePage() {
  const { agent } = useAgent();
  const [fetchingWeather, setFetchingWeather] = useState(false);
  const voiceClientRef = useRef<DailyVoiceClient | null>(null);

  useEffect(() => {
    if (!voiceClientRef.current) return;

    const handleError = (error: any) => {
      console.error('[VoicePage Error]', {
        message: error.message,
        type: error instanceof RTVIError ? 'RTVIError' : typeof error,
        stack: error.stack
      });
    };

    voiceClientRef.current.on('error', handleError);
    return () => {
      voiceClientRef.current?.off('error', handleError);
    };
  }, [voiceClientRef.current]);

  const [currentTransportState, setCurrentTransportState] = useState<TransportState>("initializing");

  useRTVIClientEvent(
    "transportStateChanged" as RTVIEvent,
    useCallback((state: TransportState) => {
      console.log('[VoicePage] Transport state changed:', state);
      setCurrentTransportState(state);
    }, [])
  );

  useRTVIClientEvent(
    "botReady" as RTVIEvent,
    useCallback(() => {
      console.log('[VoicePage] Bot ready event received');
    }, [])
  );

  useEffect(() => {
    if (!agent?.settings?.useDailyBot || !agent.settings.dailyBot) return;
    if (voiceClientRef.current) return;

    console.log('[VoicePage] Initializing voice client');
    const { dailyBot } = agent.settings;
    const initialMessage = agent.settings.initialMessage || 
      "You are a helpful assistant. I will talk to you using my voice, and you will respond with your voice. Keep responses brief and focused.";

    // Create DailyTransport with options
    const transportOptions: DailyTransportConstructorOptions = {
      dailyFactoryOptions: {}
    };

    // Use Transport from realtime-ai instead of @pipecat-ai/client-js
    const transport = new DailyTransport(transportOptions) as Transport; // Ensure compatibility

    const voiceClient = new DailyVoiceClient({
      baseUrl: "/api/daily-bot",
      params: {
        baseUrl: "/api/daily-bot",
        services: {
          ...dailyBot.services,
          stt: "deepgram"
        },
        config: [
          {
            service: "tts",
            options: [{
              name: "voice",
              value: dailyBot.voice.voice
            }],
          },
          {
            service: "llm",
            options: [
              {
                name: "model",
                value: "claude-3-5-sonnet-latest"
              },
              {
                name: "initial_messages",
                value: [
                  {
                    role: "system",
                    content: initialMessage,
                  },
                ],
              },
              {
                name: "tools",
                value: agent.settings.tools || []
              }
            ],
          },
        ],
      },
      transport, // Ensure transport is compatible with realtime-ai
      timeout: BOT_READY_TIMEOUT,
      enableCam: false,
      enableMic: true,
    });

    console.log('[VoicePage] Voice client created', {
      services: voiceClient.params.services,
      config: voiceClient.params.config
    });

    const llmHelper = new LLMHelper({
      callbacks: {
        onLLMFunctionCall: () => setFetchingWeather(true),
      },
    });

    voiceClient.registerHelper("llm", llmHelper);

    llmHelper.handleFunctionCall(async (fn: FunctionCallParams) => {
      console.log('[VoicePage] Function call received:', fn);
      const args = fn.arguments as any;
      if (fn.functionName === "get_weather" && args.location) {
        try {
          const response = await fetch(
            `/api/daily-bot/weather?location=${encodeURIComponent(args.location)}`
          );
          const json = await response.json();
          setFetchingWeather(false);
          return json;
        } catch (error) {
          console.error("[VoicePage] Weather API Error:", error);
          setFetchingWeather(false);
          return { error: "Failed to fetch weather data" };
        }
      }
      setFetchingWeather(false);
      return { error: "Unknown function call" };
    });

    voiceClientRef.current = voiceClient;
    console.log('[VoicePage] Voice client initialized');
  }, [agent]);

  if (!agent?.settings?.useDailyBot || !agent.settings.dailyBot) {
    return <NotFound />;
  }

  if (!voiceClientRef.current) return null;

  return (
    <RTVIClientProvider client={voiceClientRef.current}>
      <TooltipProvider>
        <main className="flex flex-col min-h-screen">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <DailyBotApp fetchingWeather={fetchingWeather} />
          </div>
        </main>
      </TooltipProvider>
      <RTVIClientAudio />
    </RTVIClientProvider>
  );
}
