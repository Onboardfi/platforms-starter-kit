import React, { useCallback, useRef } from "react";
import { Mic, MicOff, Pause } from "lucide-react";
import { RTVIEvent } from "realtime-ai";
import { useRTVIClientEvent } from "realtime-ai-react";
import { cn } from "@/lib/utils";

interface AudioIndicatorBubbleProps {
  onAnimationFrame?: (value: number) => void;
}

const AudioIndicatorBubble: React.FC<AudioIndicatorBubbleProps> = () => {
  const volRef = useRef<HTMLDivElement>(null);

  useRTVIClientEvent(
    RTVIEvent.LocalAudioLevel,
    useCallback((volume: number) => {
      if (volRef.current) {
        const v = Number(volume) * 1.75;
        volRef.current.style.transform = `scale(${Math.max(0.1, v)})`;
      }
    }, [])
  );

  return (
    <div 
      ref={volRef} 
      className="absolute inset-0 rounded-full bg-primary-300 transition-transform duration-300 ease-out"
    />
  );
};

interface UserMicBubbleProps {
  active: boolean;
  muted: boolean;
  handleMute: () => void;
}

export default function UserMicBubble({
  active,
  muted = false,
  handleMute,
}: UserMicBubbleProps) {
  const canTalk = !muted && active;

  return (
    <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50">
      <div className="relative flex items-center justify-center w-16 h-16">
        <button
          onClick={handleMute}
          className={cn(
            "relative w-16 h-16 flex items-center justify-center rounded-full transition-all duration-300",
            "bg-primary-300 hover:bg-primary-400",
            muted && active && "bg-primary-200 hover:bg-primary-300",
            !active && "bg-neutral-800 hover:bg-neutral-700 cursor-not-allowed",
            canTalk && "bg-primary-500 hover:bg-primary-600 shadow-lg"
          )}
        >
          <div className="relative z-10 text-white">
            {!active ? (
              <Pause className="size-8 md:size-10" />
            ) : canTalk ? (
              <Mic className="size-8 md:size-10" />
            ) : (
              <MicOff className="size-8 md:size-10" />
            )}
          </div>
          {canTalk && <AudioIndicatorBubble />}
        </button>
      </div>
    </div>
  );
}