import React, { useState } from "react";
import {
  ConfigOption,
  LLMContextMessage,
  LLMHelper,
  RTVIClientConfigOption,
  RTVIEvent,
} from "realtime-ai";
import { useVoiceClient, useVoiceClientEvent } from "realtime-ai-react";

import { Button } from "../ui/button";
import * as Card from "../ui/card";
import { Textarea } from "../ui/textarea";

type PromptProps = {
  handleClose: () => void;
};

interface LLMMessage {
  role: string;
  content: string;
}

const Prompt: React.FC<PromptProps> = ({ handleClose }) => {
  const voiceClient = useVoiceClient()!;
  const [prompt, setPrompt] = useState<LLMMessage[] | undefined>(undefined);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  useVoiceClientEvent(
    RTVIEvent.Config,
    (config: RTVIClientConfigOption[]) => {
      const llmConfig = config.find((c) => c.service === "llm");
      const initialMessages = llmConfig?.options?.find(
        (o: ConfigOption) => o.name === "initial_messages"
      );

      if (initialMessages?.value) {
        const messages = initialMessages.value as LLMMessage[];
        setPrompt(messages);
      }
    }
  );

  const save = () => {
    if (!voiceClient || !prompt) return;

    if (voiceClient.state === "ready") {
      const llmHelper = voiceClient.getHelper<LLMHelper>("llm");
      if (llmHelper) {
        llmHelper.setContext({ messages: prompt }, true);
      }
    } else {
      voiceClient.setServiceOptionInConfig("llm", {
        name: "initial_messages",
        value: prompt,
      });
    }

    setHasUnsavedChanges(false);
  };

  const updateContextMessage = (index: number, content: string) => {
    setPrompt((prev) => {
      if (!prev) return prev;
      const newPrompt = [...prev];
      newPrompt[index] = {
        ...newPrompt[index],
        content
      };
      return newPrompt;
    });
    setHasUnsavedChanges(true);
  };

  return (
    <Card.Card className="w-svw max-w-full md:max-w-md lg:max-w-lg">
      <Card.CardHeader>
        <Card.CardTitle>LLM Prompt</Card.CardTitle>
      </Card.CardHeader>
      <Card.CardContent>
        <div className="flex flex-col gap-3">
          {prompt?.map((message, i) => (
            <div key={i} className="flex flex-col gap-1 items-start">
              <span className="font-mono font-bold text-sm">
                {message.role}
              </span>
              <Textarea
                value={message.content?.toString() || ""}
                rows={prompt?.length <= 1 ? 10 : 5}
                onChange={(e) => updateContextMessage(i, e.currentTarget.value)}
                className="text-sm w-full whitespace-pre-wrap"
              />
            </div>
          ))}
        </div>
      </Card.CardContent>
      <Card.CardFooter>
        <div className="flex flex-row gap-2">
          <Button onClick={handleClose}>Close</Button>
          <Button
            variant={hasUnsavedChanges ? "default" : "outline"}
            onClick={save}
            disabled={!hasUnsavedChanges}
          >
            Update
          </Button>
        </div>
      </Card.CardFooter>
    </Card.Card>
  );
};

export default Prompt;