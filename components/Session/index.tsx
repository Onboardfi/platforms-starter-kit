import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LineChart, LogOut, Settings, StopCircle } from "lucide-react";
import { 
  RTVIEvent, 
  TransportState,
  PipecatMetricsData
} from "realtime-ai";
import { useRTVIClient, useRTVIClientEvent } from "realtime-ai-react";

import StatsAggregator from "../../utils/stats_aggregator";
import { Configure } from "../Setup";
import { Button } from "../ui/button";
import * as Card from "../ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

import Agent from "./Agent";
import Stats from "./Stats";
import UserMicBubble from "./UserMicBubble";

let stats_aggregator: StatsAggregator;

interface SessionProps {
  state: TransportState;
  onLeave: () => void;
  openMic?: boolean;
  startAudioOff?: boolean;
  fetchingWeather: boolean;
}

export const Session = ({
  state,
  onLeave,
  startAudioOff = false,
  fetchingWeather = false,
}: SessionProps) => {
  const rtviClient = useRTVIClient()!;
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [showDevices, setShowDevices] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [muted, setMuted] = useState(startAudioOff);
  const modalRef = useRef<HTMLDialogElement>(null);

  useRTVIClientEvent(
    RTVIEvent.Metrics,
    useCallback((metrics: PipecatMetricsData) => {
      if (metrics?.ttfb) {
        metrics.ttfb.forEach((m) => {
          stats_aggregator.addStat([m.processor, "ttfb", m.value, Date.now()]);
        });
      }
    }, [])
  );

  useRTVIClientEvent(
    RTVIEvent.BotStoppedSpeaking,
    useCallback(() => {
      if (hasStarted) return;
      setHasStarted(true);
    }, [hasStarted])
  );

  useEffect(() => {
    setHasStarted(false);
  }, []);

  useEffect(() => {
    if (!hasStarted || startAudioOff) return;
    rtviClient.enableMic(true);
  }, [rtviClient, startAudioOff, hasStarted]);

  useEffect(() => {
    stats_aggregator = new StatsAggregator();
  }, []);

  useEffect(() => {
    if (state === "error") {
      onLeave();
    }
  }, [state, onLeave]);

  useEffect(() => {
    const current = modalRef.current;
    if (current && showDevices) {
      current.inert = true;
      current.showModal();
      current.inert = false;
    }
    return () => current?.close();
  }, [showDevices]);

  function toggleMute() {
    rtviClient.enableMic(muted);
    setMuted(!muted);
  }

  return (
    <>
      <dialog ref={modalRef} className="bg-transparent shadow-long rounded-3xl">
        <Card.Card className="w-svw max-w-full md:max-w-md lg:max-w-lg">
          <Card.CardHeader>
            <Card.CardTitle>Configuration</Card.CardTitle>
          </Card.CardHeader>
          <Card.CardContent>
            <Configure state={state} inSession={true} />
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
        <div className="w-full max-w-[320px] sm:max-w-[420px] mt-auto shadow-long">
          <Agent
            isReady={state === "ready"}
            fetchingWeather={fetchingWeather}
            statsAggregator={stats_aggregator}
          />
        </div>
        <UserMicBubble
          active={hasStarted}
          muted={muted}
          handleMute={toggleMute}
        />
      </div>

      <footer className="w-full flex flex-row mt-auto self-end md:w-auto">
        <div className="flex flex-row justify-between gap-3 w-full md:w-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  rtviClient.action({
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
                variant="ghost"
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

          <Button onClick={() => onLeave()} className="ml-auto">
            <LogOut size={16} className="mr-2" />
            End
          </Button>
        </div>
      </footer>
    </>
  );
};

Session.displayName = "Session";

export default Session;