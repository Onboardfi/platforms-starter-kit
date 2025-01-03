// components/DailyBotSettings.tsx

import React from 'react';
import { DreamLabel, DreamSelect, DreamInput, DreamCheckbox } from './agent-form';
import { DailyBotConfig } from '@/lib/schema';

interface DailyBotSettingsProps {
  enabled: boolean;
  config: DailyBotConfig;
  onToggle: (enabled: boolean) => void;
  onUpdate: (key: keyof DailyBotConfig | string, value: any) => void;
}

export function DailyBotSettings({
  enabled,
  config,
  onToggle,
  onUpdate
}: DailyBotSettingsProps) {
  // Service options based on supported integrations
  const llmOptions = [
    { value: "together", label: "Together AI" },
    { value: "anthropic", label: "Anthropic Claude" },
    { value: "openai", label: "OpenAI" },
    { value: "grok", label: "Grok AI" },
    { value: "gemini", label: "Google Gemini" }
  ];

  const ttsOptions = [
    { value: "cartesia", label: "Cartesia TTS" }
  ];

  const sttOptions = [
    { value: "deepgram", label: "Deepgram" }
  ];

  const voiceModelOptions = [
    { value: "sonic-english", label: "Sonic (English)" },
    { value: "sonic-multilingual", label: "Sonic (Multilingual)" }
  ];

  const languageOptions = [
    { value: "en", label: "English" },
    { value: "fr", label: "French" },
    { value: "es", label: "Spanish" },
    { value: "de", label: "German" }
  ];

  const voiceOptions = {
    'sonic-english': [
      { value: "79a125e8-cd45-4c13-8a67-188112f4dd22", label: "Amanda (US)" },
      { value: "2b568345-1d48-4047-b25f-7baccf842eb0", label: "Michael (UK)" }
    ],
    'sonic-multilingual': [
      { value: "a8a1eb38-5f15-4c1d-8722-7ac0f329727d", label: "Marie (FR)" },
      { value: "846d6cb0-2301-48b6-9683-48f5618ea2f6", label: "Carlos (ES)" },
      { value: "b9de4a89-2257-424b-94c2-db18ba68c81a", label: "Hans (DE)" }
    ]
  };

  const handleServiceUpdate = (service: keyof typeof config.services, value: string) => {
    onUpdate('services', {
      ...config.services,
      [service]: value
    });
  };

  const handleVoiceUpdate = (key: keyof typeof config.voice, value: string) => {
    onUpdate('voice', {
      ...config.voice,
      [key]: value
    });
  };

  return (
    <div className="space-y-6">
      <DreamCheckbox
        checked={enabled}
        onChange={onToggle}
        label="Enable Voice Interactions"
        description="Use Daily Bot for voice-to-voice conversations"
      />

      {enabled && (
        <div className="space-y-6 p-4 bg-neutral-900/30 rounded-xl backdrop-blur-md">
          {/* LLM Service */}
          <div className="space-y-2">
            <DreamLabel>Language Model</DreamLabel>
            <DreamSelect
              value={config.services.llm}
              options={llmOptions}
              onChange={(e) => handleServiceUpdate('llm', e.target.value)}
            />
          </div>

          {/* TTS Service */}
          <div className="space-y-2">
            <DreamLabel>Text-to-Speech Service</DreamLabel>
            <DreamSelect
              value={config.services.tts}
              options={ttsOptions}
              onChange={(e) => handleServiceUpdate('tts', e.target.value)}
            />
          </div>

          {/* STT Service */}
          <div className="space-y-2">
            <DreamLabel>Speech-to-Text Service</DreamLabel>
            <DreamSelect
              value={config.services.stt}
              options={sttOptions}
              onChange={(e) => handleServiceUpdate('stt', e.target.value)}
            />
          </div>

          {/* Duration Setting */}
          <div className="space-y-2">
            <DreamLabel>Max Duration (seconds)</DreamLabel>
            <DreamInput
              type="number"
              value={config.maxDuration}
              onChange={(e) => onUpdate('maxDuration', parseInt(e.target.value))}
              min={60}
              max={3600}
            />
            <p className="text-sm text-neutral-400 mt-1">
              Maximum duration for voice interactions (60-3600 seconds)
            </p>
          </div>

          <div className="border-t border-white/[0.08] my-4" />

          {/* Voice Settings */}
          <div className="space-y-4">
            <DreamLabel>Voice Configuration</DreamLabel>
            
            <div className="space-y-2">
              <DreamLabel>Voice Model</DreamLabel>
              <DreamSelect
                value={config.voice.model}
                options={voiceModelOptions}
                onChange={(e) => handleVoiceUpdate('model', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <DreamLabel>Voice</DreamLabel>
              <DreamSelect
                value={config.voice.voice}
                options={voiceOptions[config.voice.model as keyof typeof voiceOptions] || voiceOptions['sonic-english']}
                onChange={(e) => handleVoiceUpdate('voice', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <DreamLabel>Language</DreamLabel>
              <DreamSelect
                value={config.voice.language}
                options={languageOptions}
                onChange={(e) => handleVoiceUpdate('language', e.target.value)}
              />
            </div>
          </div>

          <div className="p-4 bg-neutral-900/50 rounded-xl">
            <p className="text-sm text-neutral-400">
              Configure voice characteristics based on your selected language model and voice type.
              These settings will be used for all voice interactions with this agent.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default DailyBotSettings;