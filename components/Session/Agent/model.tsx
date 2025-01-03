import React, { useEffect } from "react";
import { RTVIEvent, RTVIClientConfigOption, ConfigOption } from "realtime-ai";
import { useRTVIClient, useRTVIClientEvent } from "realtime-ai-react";

const ModelBadge: React.FC = () => {
  const rtviClient = useRTVIClient()!;
  const [model, setModel] = React.useState<string | undefined>(undefined);

  const getModelFromConfig = async () => {
    if (!rtviClient) return;

    try {
      const serviceConfig = await rtviClient.getServiceOptionsFromConfig("llm");
      if (!serviceConfig) return;

      const modelOption = serviceConfig.options.find((option: ConfigOption) => 
        option.name === "model"
      );

      if (modelOption) {
        setModel(modelOption.value as string);
      }
    } catch (error) {
      console.error("Failed to get model from config:", error);
    }
  };

  useEffect(() => {
    getModelFromConfig();
  }, []);

  useRTVIClientEvent(
    RTVIEvent.Config,
    () => {
      getModelFromConfig();
    }
  );

  return (
    <div className="absolute top-3 left-3 right-3 text-center z-[99] text-xs font-semibold uppercase text-primary-500">
      {model || "Default"}
    </div>
  );
};

export default ModelBadge;