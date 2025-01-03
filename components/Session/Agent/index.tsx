import React, { memo, useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { RTVIEvent } from "realtime-ai";
import { useRTVIClientEvent } from "realtime-ai-react";
import { cn } from "@/lib/utils";

import ModelBadge from "./model";
import WaveForm from "./waveform";
import StatsAggregator from "@/utils/stats_aggregator";

interface AgentProps {
  isReady: boolean;
  statsAggregator: StatsAggregator;
  fetchingWeather: boolean;
}

export const Agent: React.FC<AgentProps> = memo(
  ({ isReady, statsAggregator, fetchingWeather = false }) => {
    const [hasStarted, setHasStarted] = useState<boolean>(false);
    const [botStatus, setBotStatus] = useState<
      "initializing" | "connected" | "disconnected"
    >("initializing");
    const [botIsTalking, setBotIsTalking] = useState<boolean>(false);

    useEffect(() => {
      if (!isReady) return;
      setHasStarted(true);
      setBotStatus("connected");
    }, [isReady]);

    useRTVIClientEvent(
      RTVIEvent.BotDisconnected,
      useCallback(() => {
        setHasStarted(false);
        setBotStatus("disconnected");
      }, [])
    );

    useRTVIClientEvent(
      RTVIEvent.BotStartedSpeaking,
      useCallback(() => {
        setBotIsTalking(true);
      }, [])
    );

    useRTVIClientEvent(
      RTVIEvent.BotStoppedSpeaking,
      useCallback(() => {
        setBotIsTalking(false);
      }, [])
    );

    useEffect(() => () => setHasStarted(false), []);

    return (
      <div className="p-2 relative">
        <div 
          className={cn(
            "min-w-[400px] aspect-square rounded-2xl relative flex items-center justify-center transition-colors duration-2000 overflow-hidden md:min-w-0",
            "bg-primary-300",
            hasStarted && "bg-neutral-600",
            botIsTalking && "bg-primary-950"
          )}
        >
          <ModelBadge />
          
          {!hasStarted ? (
            <span className="p-3 inline-block rounded-full bg-primary-600 text-white absolute">
              <Loader2 size={32} className="animate-spin" />
            </span>
          ) : (
            <>
              {fetchingWeather && (
                <span className="p-3 inline-block rounded-full bg-primary-900 text-white absolute">
                  <Loader2 size={32} className="animate-spin" />
                </span>
              )}
              <WaveForm />
            </>
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => 
    prevProps.isReady === nextProps.isReady && 
    prevProps.fetchingWeather === nextProps.fetchingWeather
);

Agent.displayName = "Agent";

export default Agent;