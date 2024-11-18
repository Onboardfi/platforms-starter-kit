// relay-server/lib/relay.mjs
import { WebSocketServer } from 'ws';
import { RealtimeClient } from '@openai/realtime-api-beta';
import http from 'http';

export class RealtimeRelay {
  constructor(apiKey, port) {
    this.apiKey = apiKey;
    this.port = port || 8081;
    
    // Create HTTP server
    this.server = http.createServer((req, res) => {
      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': 2592000 // 30 days
        });
        res.end();
        return;
      }
      
      // Handle normal requests
      res.writeHead(404);
      res.end();
    });
    
    // Create WebSocket server attached to HTTP server
    this.wss = new WebSocketServer({ 
      server: this.server,
      verifyClient: (info, cb) => {
        // Allow all origins
        const origin = info.origin || info.req.headers.origin;
        cb(true);
      }
    });
    
    this.clients = new Map();
    this.setupConnectionHandler();
    this.log(`Relay Server initialized on ws://localhost:${this.port}`);
  }

  setupConnectionHandler() {
    this.wss.on('connection', (ws, req) => {
      this.log('New client connected.');

      const client = new RealtimeClient({ apiKey: this.apiKey });

      client.realtime.on('server.*', (event) => {
        this.log(`Relaying "${event.type}" to client.`);
        ws.send(JSON.stringify(event));
      });

      client.realtime.on('close', () => {
        this.log('OpenAI RealtimeClient connection closed.');
        ws.close();
      });

      ws.on('message', async (data) => {
        try {
          const event = JSON.parse(data);
          this.log(`Relaying "${event.type}" to OpenAI.`);
          await client.realtime.send(event.type, event);
        } catch (error) {
          this.log(`Error parsing or relaying event: ${error.message}`);
          ws.send(JSON.stringify({ type: 'error', message: error.message }));
        }
      });

      ws.on('close', () => {
        this.log('Client disconnected.');
        client.disconnect();
      });

      client.connect().then(() => {
        this.log('Connected to OpenAI Realtime API successfully.');
      }).catch((error) => {
        this.log(`Error connecting to OpenAI: ${error.message}`);
        console.error('Detailed Error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to connect to OpenAI Realtime API.' }));
        ws.close();
      });

      this.clients.set(ws, client);
    });
  }

  log(...args) {
    console.log(`[RelayServer]`, ...args);
  }

  listen() {
    this.server.listen(this.port, () => {
      this.log(`WebSocket Server is listening on port ${this.port}`);
    });
  }
}