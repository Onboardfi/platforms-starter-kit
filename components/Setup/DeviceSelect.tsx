import React, { useEffect } from 'react';
import { Mic } from 'lucide-react';
import { useVoiceClientMediaDevices } from "realtime-ai-react";
import { cn } from "@/lib/utils";
import { Field } from "@/components/ui/field";
import AudioIndicatorBar from "@/components/Setup/AudioIndicator";

interface DeviceSelectProps {
  hideMeter?: boolean;
}

export const DeviceSelect: React.FC<DeviceSelectProps> = ({
  hideMeter = false,
}) => {
  const { availableMics, selectedMic, updateMic } = useVoiceClientMediaDevices();

  useEffect(() => {
    // Simply update the mic when selectedMic changes
    if (selectedMic?.deviceId) {
      updateMic(selectedMic.deviceId);
    }
  }, [updateMic, selectedMic]);

  const handleMicChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    updateMic(event.target.value);
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="Microphone" error={false}>
        <div className="flex flex-col gap-2">
          <div className="relative">
            <select
              className={cn(
                "w-full h-10 px-3 py-2",
                "text-sm rounded-md border border-input bg-background",
                "ring-offset-background focus-visible:outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "pl-10"
              )}
              value={selectedMic?.deviceId || ""}
              onChange={handleMicChange}
            >
              {availableMics.length === 0 ? (
                <option value="">Loading devices...</option>
              ) : (
                availableMics.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microphone ${mic.deviceId.slice(0, 4)}`}
                  </option>
                ))
              )}
            </select>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Mic className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          {!hideMeter && <AudioIndicatorBar />}
        </div>
      </Field>
    </div>
  );
};

export default DeviceSelect;