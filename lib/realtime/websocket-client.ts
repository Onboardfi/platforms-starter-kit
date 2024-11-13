// lib/realtime/websocket-client.ts
import { EventEmitter } from 'events';
import { ReconnectingWebSocket } from './reconnecting-websocket';
import { 
  WebSocketEvent, 
  WebSocketMessage, 
  ToolDefinition, 
  ToolCallData,
  WebSocketToolMessage 
} from './types';

interface WebSocketClientOptions {
  url?: string;
}

export class WebSocketClient extends EventEmitter {
  private ws: ReconnectingWebSocket | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private connected: boolean = false;
  private url: string;

  constructor(options: WebSocketClientOptions = {}) {
    super();
    this.url = options.url || this.getWebSocketURL();
  }

  private getWebSocketURL(): string {
    if (typeof window === 'undefined') return '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/api/ws`;
  }

  async connect(): Promise<void> {
    if (this.ws) return;

    this.ws = new ReconnectingWebSocket(this.url);

    this.ws.onopen = () => {
      this.connected = true;
      this.emit('connected');
      this.processQueue();
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.emit('disconnected');
    };

    this.ws.onmessage = (event: WebSocketEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.emit(message.type, message.event || message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error: Event) => {
      this.emit('error', error);
    };
  }

  async disconnect(): Promise<void> {
    if (!this.ws) return;
    this.ws.close();
    this.ws = null;
    this.connected = false;
  }

  send(message: WebSocketMessage): void {
    if (!this.connected || !this.ws) {
      this.messageQueue.push(message);
      return;
    }

    this.ws.send(JSON.stringify(message));
  }

  private async processQueue(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) this.send(message);
    }
  }

  async updateSession(data: Record<string, any>): Promise<void> {
    this.send({ type: 'update_session', data });
  }

  appendInputAudio(audioData: Int16Array): void {
    this.send({ type: 'append_audio', data: Array.from(audioData) });
  }

  async createResponse(): Promise<void> {
    this.send({ type: 'create_response' });
  }

  async cancelResponse(id: string, offset: number): Promise<void> {
    this.send({ 
      type: 'cancel_response', 
      id, 
      offset 
    });
  }

  addTool(toolDef: ToolDefinition, callback: (params: Record<string, any>) => Promise<any>): void {
    const message: WebSocketToolMessage = {
      type: 'add_tool',
      tool: toolDef
    };
    this.send(message);
    
    this.on('tool_call', async (data: ToolCallData) => {
      if (data.tool === toolDef.name) {
        const result = await callback(data.params);
        this.send({
          type: 'tool_response',
          tool: toolDef.name,
          result
        });
      }
    });
  }
}