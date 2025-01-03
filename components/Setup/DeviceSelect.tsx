import { useEffect } from "react";
import { Mic } from "lucide-react";
import { useRTVIClientMediaDevices } from "realtime-ai-react";
import { cn } from "@/lib/utils";

import { Field } from "../ui/field";
import { Select } from "../ui/select";
import { AudioIndicatorBar } from "./AudioIndicator";

interface DeviceSelectProps {
  hideMeter?: boolean;
}

interface SelectChangeEvent extends Event {
  currentTarget: HTMLSelectElement;
}

export const DeviceSelect: React.FC<DeviceSelectProps> = ({
  hideMeter = false,
}) => {
  const { availableMics, selectedMic, updateMic } = useRTVIClientMediaDevices();

  useEffect(() => {
    if (selectedMic?.deviceId) {
      updateMic(selectedMic.deviceId);
    }
  }, [updateMic, selectedMic]);

  const handleMicChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    updateMic(event.target.value);
  };

  return (
    <div className="flex flex-col flex-wrap gap-4">
      <Field label="Microphone" error={false}>
        <div className="relative">
          <select
            className={cn(
              "w-full h-10 px-3 py-2",
              "text-sm rounded-md border border-input bg-background",
              "ring-offset-background focus-visible:outline-none", 
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            value={selectedMic?.deviceId || ""}
            onChange={handleMicChange}
          >
            {availableMics.length === 0 ? (
              <option value="">Loading devices...</option>
            ) : (
              availableMics.map((mic) => (
                <option key={mic.deviceId} value={mic.deviceId}>
                  {mic.label}
                </option>
              ))
            )}
          </select>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Mic size={24} />
          </div>
        </div>
        {!hideMeter && <AudioIndicatorBar />}
      </Field>
    </div>
  );
};

export default DeviceSelect;