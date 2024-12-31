// types/daily-bot.d.ts

import { RTVIClient } from 'realtime-ai';
import { SelectSite, SelectOrganization } from '@/lib/schema';

/**
 * Core Daily Bot Message Types
 */
export interface DailyBotMessage {
  type: 'bot_speaking_started' | 'bot_speaking_stopped' | 'daily_bot_connected' | 'daily_bot_disconnected';
  timestamp: string;
  data?: any;
}

/**
 * Daily Bot Error Types
 */
export interface DailyBotError extends Error {
  code?: string;
  details?: Record<string, any>;
}

/**
 * Daily Bot Services Configuration
 */
export type LLMService = 'together' | 'anthropic' | 'openai' | 'grok' | 'gemini';
export type TTSService = 'cartesia';
export type STTService = 'deepgram';

/**
 * Daily Bot Voice Configuration
 */
export type VoiceModel = 'sonic-english' | 'sonic-multilingual';
export type Language = 'en' | 'fr' | 'es' | 'de';

/**
 * Complete Daily Bot Configuration
 */
export interface DailyBotConfig {
  botProfile: string;
  maxDuration: number;
  services: {
    llm: LLMService;
    tts: TTSService;
    stt: STTService;
  };
  voice: {
    model: VoiceModel;
    voice: string;
    language: Language;
  };
}

/**
 * Extended Site Type with Required Properties
 */
export interface ExtendedSite extends SelectSite {
  image: string | null;
  imageBlurhash: string | null;
  organization: SelectOrganization;
}

/**
 * Daily Bot Console Props
 */
export interface DailyBotConsoleProps {
  agent: {
    id: string;
    settings: {
      useDailyBot?: boolean;
      dailyBot?: DailyBotConfig;
      initialMessage?: string;
      onboardingType: 'internal' | 'external';
    };
    site?: ExtendedSite;
  };
  onMessage: (message: DailyBotMessage) => void;
  onError: (error: DailyBotError) => void;
}

/**
 * Daily Bot State Management
 */
export interface DailyBotState {
  isConnected: boolean;
  isRecording: boolean;
  voiceClient: RTVIClient | null;
  currentSessionId: string | null;
  status: 'idle' | 'connected' | 'error';
}

/**
 * Daily Bot Service Options
 */
export interface DailyBotServiceOption {
  value: string;
  label: string;
}

/**
 * Daily Bot Voice Options Configuration
 */
export interface DailyBotVoiceOptions {
  'sonic-english': Array<{
    value: string;
    label: string;
  }>;
  'sonic-multilingual': Array<{
    value: string;
    label: string;
  }>;
}

/**
 * Daily Bot Settings Component Props
 */
export interface DailyBotSettingsProps {
  enabled: boolean;
  config: DailyBotConfig;
  onToggle: (enabled: boolean) => void;
  onUpdate: (key: keyof DailyBotConfig | string, value: any) => void;
}