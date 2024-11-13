// lib/realtime/reconnecting-websocket.ts
export class ReconnectingWebSocket {
    private ws: WebSocket | null = null;
    private url: string;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectInterval = 1000;
    private maxReconnectInterval = 30000;
  
    // Event handlers
    public onopen: ((event: Event) => void) | null = null;
    public onclose: ((event: CloseEvent) => void) | null = null;
    public onmessage: ((event: MessageEvent) => void) | null = null;
    public onerror: ((event: Event) => void) | null = null;
  
    constructor(url: string) {
      this.url = url;
      this.connect();
    }
  
    private connect() {
      try {
        this.ws = new WebSocket(this.url);
  
        this.ws.onopen = (event: Event) => {
          this.reconnectAttempts = 0;
          if (this.onopen) this.onopen(event);
        };
  
        this.ws.onclose = (event: CloseEvent) => {
          if (this.onclose) this.onclose(event);
          this.handleReconnect();
        };
  
        this.ws.onmessage = (event: MessageEvent) => {
          if (this.onmessage) this.onmessage(event);
        };
  
        this.ws.onerror = (event: Event) => {
          if (this.onerror) this.onerror(event);
        };
      } catch (error) {
        this.handleReconnect();
      }
    }
  
    private handleReconnect() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        return;
      }
  
      const timeout = Math.min(
        this.reconnectInterval * Math.pow(2, this.reconnectAttempts),
        this.maxReconnectInterval
      );
  
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, timeout);
    }
  
    public send(data: string): void {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(data);
      }
    }
  
    public close(): void {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    }
  }