// types/realtime-ai.d.ts
declare module 'realtime-ai' {
    export class RTVIClient {
      constructor(options: {
        transport: any;
        params: {
          baseUrl: string;
          requestData: {
            services: Record<string, string>;
            config: RTVIClientConfigOption[];
            agentId?: string;
            settings?: Record<string, any>;
          };
        };
        timeout?: number;
      });
      connect(): Promise<void>;
      disconnect(): Promise<void>;
      enableMic(enabled: boolean): void;
      registerHelper(name: string, helper: any): void;
    }
  
    export class LLMHelper {
      constructor(options: any);
    }
  
    export enum RTVIEvent {
      BotStartedSpeaking = 'bot_started_speaking',
      BotStoppedSpeaking = 'bot_stopped_speaking',
      UserStartedSpeaking = 'user_started_speaking',
      UserStoppedSpeaking = 'user_stopped_speaking',
      Connected = 'connected',
      Disconnected = 'disconnected',
    }
  
    export interface RTVIClientConfigOption {
      service: string;
      options: Array<{
        name: string;
        value: any;
      }>;
    }
  }