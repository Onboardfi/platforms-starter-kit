// lib/daily-bot-config.ts
export const BOT_READY_TIMEOUT = 15 * 1000; // 15 seconds

export type DailyBotVoiceConfig = {
  model: string;
  voice: string;
  language: string;
};

export type DailyBotServices = {
  llm: string;
  tts: string;
  stt: string;
};

export type DailyBotConfig = {
  botProfile: string;
  maxDuration: number;
  services: DailyBotServices;
  voice: DailyBotVoiceConfig;
};

export const defaultDailyBotConfig: DailyBotConfig = {
  botProfile: "voice_2024_10",
  maxDuration: 600,
  services: {
    llm: "anthropic",
    tts: "cartesia",
    stt: "deepgram"
  },
  voice: {
    model: "sonic-english",
    voice: "79a125e8-cd45-4c13-8a67-188112f4dd22",
    language: "en"
  }
};