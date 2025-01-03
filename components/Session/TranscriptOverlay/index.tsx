import React, { useCallback, useEffect, useRef, useState } from "react";
import { RTVIEvent } from "realtime-ai";
import { useRTVIClientEvent } from "realtime-ai-react";
import { cn } from "@/lib/utils";

interface KeyframesDefinition {
  [key: string]: {
    [key: string]: {
      opacity?: string;
      transform?: string;
    };
  };
}

const transcriptKeyframes: KeyframesDefinition = {
  '@keyframes slideUp': {
    '0%': {
      opacity: '0',
      transform: 'translateY(1rem)',
    },
    '10%, 90%': {
      opacity: '1',
      transform: 'translateY(0)',
    },
    '100%': {
      opacity: '0',
      transform: 'translateY(-1rem)',
    },
  },
};

const TranscriptOverlay: React.FC = () => {
  const [sentences, setSentences] = useState<string[]>([]);
  const [sentencesBuffer, setSentencesBuffer] = useState<string[]>([]);
  const displayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleTranscript = useCallback((data: { text: string }) => {
    if (!data?.text?.trim()) return;
    setSentencesBuffer(prev => [...prev, data.text.trim()]);
  }, []);

  useRTVIClientEvent(
    RTVIEvent.BotTranscript,
    handleTranscript
  );

  useEffect(() => {
    if (sentencesBuffer.length === 0) return;

    const interval = 1000 * sentences.length;
    displayIntervalRef.current = setTimeout(() => {
      setSentences(prev => [...prev, sentencesBuffer[0]]);
      setSentencesBuffer(prev => prev.slice(1));
    }, interval);

    return () => {
      if (displayIntervalRef.current) {
        clearTimeout(displayIntervalRef.current);
        displayIntervalRef.current = null;
      }
    };
  }, [sentencesBuffer, sentences]);

  if (sentences.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 pointer-events-none z-50">
      <div className="max-w-2xl mx-auto">
        {sentences.map((sentence, index) => (
          <abbr
            key={`${sentence}-${index}`}
            className={cn(
              "block text-center mb-2",
              "text-primary-200 opacity-0",
              "animate-[slideUp_4s_ease-in-out]"
            )}
            onAnimationEnd={() => {
              setSentences(prev => prev.filter((_, i) => i !== index));
            }}
          >
            <span className="font-medium">{sentence}</span>
          </abbr>
        ))}
      </div>
    </div>
  );
};

export default TranscriptOverlay;