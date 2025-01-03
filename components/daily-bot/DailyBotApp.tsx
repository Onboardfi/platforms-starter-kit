///Users/bobbygilbert/Documents/GitHub/platforms-starter-kit/components/daily-bot/DailyBotApp.tsx

"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LineChart, LogOut, Settings, StopCircle, Ear } from "lucide-react";
import { RTVIEvent, RTVIMessage, RTVIError, PipecatMetricsData } from "realtime-ai";
import {
  useRTVIClient,
  useRTVIClientEvent,
  useRTVIClientTransportState,
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
let audioContext: AudioContext | null = null;

const status_text = {
  idle: "Initializing...",
  initializing: "Initializing...",
  initialized: "Start",
  authenticating: "Requesting bot...",
  connecting: "Connecting...",
};

interface DailyBotAppProps {
  fetchingWeather: boolean;
}

export const DailyBotApp: React.FC<DailyBotAppProps> = ({ fetchingWeather }) => {
  const rtviClient = useRTVIClient();
  const transportState = useRTVIClientTransportState();

  const [appState, setAppState] = useState<"idle" | "ready" | "connecting" | "connected">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showDevices, setShowDevices] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);

  const log = (area: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[DailyBotApp ${timestamp}] ${area}: ${message}`);
    if (data) {
      console.log(`[DailyBotApp ${timestamp}] Data:`, data);
    }
  };

  useRTVIClientEvent(
    RTVIEvent.Error,
    useCallback((message: RTVIMessage) => {
      const errorData = message.data as { error: string; fatal: boolean };
      log('ErrorEvent', 'Received error event', errorData);
      if (!errorData.fatal) return;
      setError(errorData.error);
    }, [])
  );

  useRTVIClientEvent(
    RTVIEvent.BotStartedSpeaking,
    useCallback(() => {
      log('BotStartedSpeaking', `hasStarted: ${hasStarted}`);
      if (!hasStarted) setHasStarted(true);
    }, [hasStarted])
  );

  useRTVIClientEvent(
    RTVIEvent.Metrics,
    useCallback((metrics: PipecatMetricsData) => {
      log('Metrics', 'Received metrics data', metrics);
      if (metrics?.ttfb) {
        metrics.ttfb.forEach((m) => {
          stats_aggregator.addStat([m.processor, "ttfb", m.value, Date.now()]);
        });
      }
    }, [])
  );

  useEffect(() => {
    if (!rtviClient || appState !== "idle") return;
    log('DeviceInit', 'Initializing devices');
    rtviClient.initDevices().catch(error => {
      log('DeviceInit', 'Device initialization error', error);
    });
  }, [appState, rtviClient]);

  useEffect(() => {
    log('TransportState', `Transport state changed to: ${transportState}`);
    switch (transportState) {
      case "initialized":
        setAppState("ready");
        break;
      case "authenticating":
      case "connecting":
        setAppState("connecting");
        break;
      case "connected":
      case "ready":
        setAppState("connected");
        break;
      default:
        setAppState("idle");
    }
    log('AppState', `App state set to: ${appState}`);
  }, [transportState]);

  useEffect(() => {
    log('MicState', `hasStarted: ${hasStarted}, muted: ${muted}`);
    if (!hasStarted || muted) return;
    rtviClient?.enableMic(true);
  }, [hasStarted, muted, rtviClient]);

  useEffect(() => {
    log('Init', 'Component mounted, resetting state');
    setHasStarted(false);
    stats_aggregator = new StatsAggregator();
  }, []);

  useEffect(() => {
    if (transportState === "error") {
      log('ErrorState', 'Transport entered error state, disconnecting');
      rtviClient?.disconnect();
    }
  }, [transportState, rtviClient]);

  useEffect(() => {
    const current = modalRef.current;
    if (current && showDevices) {
      log('DeviceModal', 'Showing device settings modal');
      current.inert = true;
      current.showModal();
      current.inert = false;
    }
    return () => current?.close();
  }, [showDevices]);

  // Clean up AudioContext when component unmounts
  useEffect(() => {
    return () => {
      if (audioContext) {
        log('Cleanup', 'Closing AudioContext');
        audioContext.close();
        audioContext = null;
      }
    };
  }, []);async function start() {
    if (!rtviClient) {
        log('Start', 'No RTVI client available');
        return;
    }

    try {
        log('Start', 'Starting connection process');
        rtviClient.enableMic(false);
        
        // First request - get auth credentials
        log('Start', 'Requesting auth credentials');
        const connectResponse = await fetch('/api/daily-bot/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                config: rtviClient.params.config,
            }),
        });
        
        const responseData = await connectResponse.json();
        log('Start', 'Received auth response', responseData);

        if (!connectResponse.ok) {
            throw new Error(responseData.error || "Failed to start bot");
        }

        // Update params
        rtviClient.params = {
            ...rtviClient.params,
            bot_token: responseData.token,
            daily: {
                room_url: responseData.roomUrl,
                token: responseData.token
            }
        };

        log('Start', 'Attempting connection');
        await rtviClient.connect();
        log('Start', 'Connection successful');

    } catch (error) {
        log('Start', 'Connection error', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        setError(error instanceof Error ? error.message : "Failed to start session");
        rtviClient?.disconnect();
    }
}
  function toggleMute() {
    log('Mic', `Toggling mute: ${!muted}`);
    rtviClient?.enableMic(!muted);
    setMuted(!muted);
  }

  if (error) {
    log('Render', 'Rendering error state', { error });
    return (
      <Alert variant="destructive" title="An error occurred">
        {error}
      </Alert>
    );
  }

  if (appState === "connected") {
    log('Render', 'Rendering connected state');
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
              fetchingWeather={fetchingWeather}
              statsAggregator={stats_aggregator}
            />
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
                    log('Action', 'Interrupting bot');
                    rtviClient?.action({
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
              onClick={() => {
                log('Action', 'Disconnecting');
                rtviClient?.disconnect();
              }} 
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

  const isReady = appState === "ready";
  log('Render', 'Rendering pre-connection UI', { isReady, transportState });

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
          onClick={async () => {
            try {
              // Resume AudioContext on button click
              if (audioContext?.state === 'suspended') {
                await audioContext.resume();
                log('ButtonClick', 'AudioContext resumed', { state: audioContext.state });
              }
              await start();
            } catch (error) {
              log('ButtonClick', 'Error starting session', error);
              setError("Failed to start session");
            }
          }} 
          disabled={!isReady} 
          className="w-full"
        >
          {status_text[transportState as keyof typeof status_text]}
        </Button>
      </Card.CardFooter>
    </Card.Card>
  );
};