import { useCallback, useRef } from "react";
import { RTVIEvent } from "realtime-ai";
import { useRTVIClientEvent } from "realtime-ai-react";
import { cn } from "@/lib/utils";

interface AudioIndicatorBarProps {
  className?: string;
}

export const AudioIndicatorBar: React.FC<AudioIndicatorBarProps> = ({ className }) => {
  const volRef = useRef<HTMLDivElement>(null);

  useRTVIClientEvent(
    RTVIEvent.LocalAudioLevel,
    useCallback((volume: number) => {
      if (volRef.current) {
        volRef.current.style.width = `${Math.max(2, volume * 100)}%`;
      }
    }, [])
  );

  return (
    <div className={cn("relative h-1 w-full bg-black/20 rounded overflow-hidden", className)}>
      <div 
        ref={volRef} 
        className="absolute inset-y-0 left-0 bg-primary-500 transition-all duration-75 ease-out"
        style={{ width: '2%' }}
      />
    </div>
  );
};

export default AudioIndicatorBar;