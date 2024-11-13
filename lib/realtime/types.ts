// lib/realtime/types.ts
import { RealtimeClient } from '@openai/realtime-api-beta';

export interface BaseWebSocketMessage {
  type: string;
  event?: any;
  data?: any;
  error?: string;
}

export interface WebSocketToolMessage extends BaseWebSocketMessage {
  tool: ToolDefinition | string;
  params?: Record<string, any>;
  result?: any;
}

export interface WebSocketResponseMessage extends BaseWebSocketMessage {
  id?: string;
  offset?: number;
}

export type WebSocketMessage = BaseWebSocketMessage | WebSocketToolMessage | WebSocketResponseMessage;

export interface WebSocketEvent extends Event {
  data: string;
}

export interface RealtimeEvent {
  type: string;
  [key: string]: any;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export interface ToolCallData {
  tool: string;
  params: Record<string, any>;
}

export type RealtimeClientType = InstanceType<typeof RealtimeClient>;

// Type guard functions
export function isToolMessage(message: WebSocketMessage): message is WebSocketToolMessage {
  return 'tool' in message;
}

export function isResponseMessage(message: WebSocketMessage): message is WebSocketResponseMessage {
  return 'id' in message || 'offset' in message;
}