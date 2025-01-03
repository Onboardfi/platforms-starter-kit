"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LineChart, LogOut, Settings, StopCircle, Ear, Loader2 } from "lucide-react";
import {
  VoiceEvent,
  VoiceMessage,
  TransportState,
  PipecatMetrics
} from "realtime-ai";
import {
  useVoiceClient,
  useVoiceClientEvent,
  useVoiceClientTransportState,
} from "realtime-ai-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import * as Card from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import Stats from "@/components/Session/Stats";
import UserMicBubble from "@/components/Session/UserMicBubble";
import Agent from "@/components/Session/Agent";
import { DeviceSelect } from "@/components/Setup/DeviceSelect";
import StatsAggregator from "@/utils/stats_aggregator";

let stats_aggregator = new StatsAggregator();

const status_text: Record<TransportState, string> = {
  idle: "Initializing...",
  initializing: "Initializing...",
  initialized: "Start",
  authenticating: "Requesting bot...",
  connecting: "Connecting...",
  connected: "Connected",
  ready: "Ready",
  disconnected: "Start",
  error: "Error"
};

interface DailyBotAppProps {
  fetchingWeather: boolean;
}

export const DailyBotApp: React.FC<DailyBotAppProps> = ({ fetchingWeather }) => {
  const voiceClient = useVoiceClient();
  const transportState = useVoiceClientTransportState();

  const [error, setError] = useState<string | null>(null);
  const [showDevices, setShowDevices] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);

  useVoiceClientEvent(
    VoiceEvent.Error,
    useCallback((message: VoiceMessage) => {
      const errorData = message.data as { error: string; fatal: boolean };
      if (!errorData.fatal) return;
      setError(errorData.error);
    }, [])
  );

  useVoiceClientEvent(
    VoiceEvent.BotStartedSpeaking,
    useCallback(() => {
      if (!hasStarted) setHasStarted(true);
    }, [hasStarted])
  );

  useVoiceClientEvent(
    VoiceEvent.Metrics,
    useCallback((metrics: PipecatMetrics) => {
      metrics?.ttfb?.forEach((m) => {
        stats_aggregator.addStat([m.processor, "ttfb", m.value, Date.now()]);
      });
    }, [])
  );

  useEffect(() => {
    // Initialize devices when client is ready
    if (voiceClient && transportState === "initialized") {
      voiceClient.initDevices().catch(error => {
        console.error("[DailyBotApp] Device init error:", error);
      });
    }
  }, [transportState, voiceClient]);

  useEffect(() => {
    if (!hasStarted || muted) return;
    voiceClient?.enableMic(true);
  }, [hasStarted, muted, voiceClient]);

  useEffect(() => {
    setHasStarted(false);
    stats_aggregator = new StatsAggregator();
  }, []);

  useEffect(() => {
    if (transportState === "error") {
      voiceClient?.disconnect();
    }
  }, [transportState, voiceClient]);

  useEffect(() => {
    const current = modalRef.current;
    if (current && showDevices) {
      current.inert = true;
      current.showModal();
      current.inert = false;
    }
    return () => current?.close();
  }, [showDevices]);
  useEffect(() => {
    // Initialize devices when client is ready and in the initialized state
    if (!voiceClient || transportState !== "initialized") return;
    
    const initDevices = async () => {
      console.log("[DailyBotApp] Initializing devices...");
      try {
        await voiceClient.initDevices();
        console.log("[DailyBotApp] Devices initialized successfully");
      } catch (error) {
        console.error("[DailyBotApp] Device init error:", error);
      }
    };
  
    initDevices();
  }, [transportState, voiceClient]);
// And update the start function:
async function start() {
    if (!voiceClient) return;
  
    try {
      console.log("[DailyBotApp] Starting voice client...");
      voiceClient.enableMic(false);
      
      // Make sure we're initialized
      if (transportState !== "initialized") {
        console.log("[DailyBotApp] Waiting for initialization...");
        return;
      }
      
      await voiceClient.start();
      console.log("[DailyBotApp] Voice client started");
    } catch (error) {
      console.error("[DailyBotApp] Start error:", error);
      setError(error instanceof Error ? error.message : "Failed to start session");
      voiceClient?.disconnect();
    }
  }

  function toggleMute() {
    voiceClient?.enableMic(!muted);
    setMuted(!muted);
  }

  if (error) {
    return (
      <Alert variant="destructive" title="An error occurred">
        {error}
      </Alert>
    );
  }

  if (transportState === "ready") {
    return (
      <>
        <dialog ref={modalRef} className="bg-transparent shadow-long rounded-3xl">
          <Card.Card className="w-svw max-w-full md:max-w-md lg:max-w-lg">
            <Card.CardHeader>
              <Card.CardTitle>Device Settings</Card.CardTitle>
            </Card.CardHeader>
            <Card.CardContent>
              <DeviceSelect hideMeter={false} />
            </Card.CardContent>
            <Card.CardFooter>
              <Button onClick={() => setShowDevices(false)}>Close</Button>
            </Card.CardFooter>
          </Card.Card>
        </dialog>

        {showStats &&
          createPortal(
            <Stats
              statsAggregator={stats_aggregator}
              handleClose={() => setShowStats(false)}
            />,
            document.getElementById("tray")!
          )}

        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <Card.Card className="w-full max-w-[320px] sm:max-w-[420px] mt-auto shadow-long">
            <Agent
                        isReady={transportState === "ready"}
                        fetchingWeather={fetchingWeather} statsAggregator={stats_aggregator}         />
          </Card.Card>

          <UserMicBubble active={hasStarted} muted={muted} handleMute={toggleMute} />
        </div>

        <footer className="w-full flex flex-row mt-auto self-end md:w-auto">
          <div className="flex flex-row justify-between gap-3 w-full md:w-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    voiceClient?.action({
                      service: "tts",
                      action: "interrupt",
                      arguments: [],
                    });
                  }}
                >
                  <StopCircle />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Interrupt bot</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showStats ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setShowStats(!showStats)}
                >
                  <LineChart />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Show statistics panel</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDevices(true)}
                >
                  <Settings />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Configure devices</TooltipContent>
            </Tooltip>

            <Button 
              onClick={() => voiceClient?.disconnect()} 
              className="ml-auto"
            >
              <LogOut className="h-4 w-4" />
              End
            </Button>
          </div>
        </footer>
      </>
    );
  }

  const isReady = transportState === "initialized";

  return (
    <Card.Card className="animate-appear max-w-lg mb-14">
      <Card.CardHeader>
        <Card.CardTitle>Ready to Start Voice Interaction</Card.CardTitle>
      </Card.CardHeader>
      <Card.CardContent className="space-y-6">
        <div className="flex flex-row gap-2 bg-primary-50 px-4 py-2 md:p-2 text-sm items-center justify-center rounded-md font-medium text-pretty">
          <Ear className="size-7 md:size-5 text-primary-400" />
          Works best in a quiet environment with a good internet connection.
        </div>
        <DeviceSelect hideMeter={false} />
      </Card.CardContent>
      <Card.CardFooter>
        <Button 
          onClick={start}
          disabled={!isReady} 
          className="w-full"
        >
          {!isReady && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {status_text[transportState]}
        </Button>
      </Card.CardFooter>
    </Card.Card>
  );
};