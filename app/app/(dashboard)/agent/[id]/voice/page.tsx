"use client";

import { useEffect, useRef, useState } from "react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { FunctionCallParams, LLMHelper } from "realtime-ai";
import { DailyVoiceClient } from "realtime-ai-daily";
import { VoiceClientAudio, VoiceClientProvider } from "realtime-ai-react";

import App from "@/components/App";
import { CharacterProvider } from "@/components/context";
import Header from "@/components/Header";
import Splash from "@/components/Splash";
import {
  BOT_READY_TIMEOUT,
  defaultConfig,
  defaultServices,
} from "@/rtvi.config";

export default function VoicePage() {
  const [showSplash, setShowSplash] = useState(true);
  const [fetchingWeather, setFetchingWeather] = useState(false);
  const voiceClientRef = useRef<DailyVoiceClient | null>(null);

  useEffect(() => {
    if (!showSplash || voiceClientRef.current) {
      return;
    }

    const voiceClient = new DailyVoiceClient({
        baseUrl: "/api/daily-bot",  // Remove process.env.NEXT_PUBLIC_BASE_URL
        services: defaultServices,
      config: defaultConfig,
      timeout: BOT_READY_TIMEOUT,
    });

    const llmHelper = new LLMHelper({
      callbacks: {
        onLLMFunctionCall: (fn) => {
          console.log('[VoicePage] LLM Function called:', fn);
          setFetchingWeather(true);
        },
      },
    });
    voiceClient.registerHelper("llm", llmHelper);

    llmHelper.handleFunctionCall(async (fn: FunctionCallParams) => {
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
          console.error('[VoicePage] Weather API Error:', error);
          setFetchingWeather(false);
          return { error: "Failed to fetch weather data" };
        }
      }
      setFetchingWeather(false);
      return { error: "Unknown function call" };
    });

    voiceClientRef.current = voiceClient;
  }, [showSplash]);

  if (showSplash) {
    return <Splash handleReady={() => setShowSplash(false)} />;
  }

  if (!voiceClientRef.current) {
    console.log('[VoicePage] Waiting for initialization...');
    return null;
  }

  return (
    <VoiceClientProvider voiceClient={voiceClientRef.current}>
      <CharacterProvider>
        <TooltipProvider>
          <main>
            <Header />
            <div id="app">
              <App fetchingWeather={fetchingWeather} />
            </div>
          </main>
          <aside id="tray" />
        </TooltipProvider>
      </CharacterProvider>
      <VoiceClientAudio />
    </VoiceClientProvider>
  );
}