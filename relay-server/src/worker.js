// src/worker.js
import { RealtimeClient } from '@openai/realtime-api-beta';

export class CloudflareRelay {
  constructor(env) {
    this.env = env;
  }

  async handleRequest(request) {
    if (!this.env.OPENAI_API_KEY) {
      return new Response('OpenAI API key not configured', { status: 500 });
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '2592000'
        },
        status: 204
      });
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected websocket', { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    const realtimeClient = new RealtimeClient({ apiKey: this.env.OPENAI_API_KEY });

    realtimeClient.realtime.on('server.*', (event) => {
      server.send(JSON.stringify(event));
      console.log(`Relaying "${event.type}" to client`);
    });

    realtimeClient.realtime.on('close', () => {
      console.log('OpenAI RealtimeClient connection closed');
      server.close();
    });

    server.accept();

    server.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`Relaying "${data.type}" to OpenAI`);
        await realtimeClient.realtime.send(data.type, data);
      } catch (error) {
        console.error('Error:', error);
        server.send(JSON.stringify({ type: 'error', message: error.message }));
      }
    });

    server.addEventListener('close', () => {
      console.log('Client disconnected');
      realtimeClient.disconnect();
    });

    await realtimeClient.connect();
    console.log('Connected to OpenAI Realtime API');

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }
}

export default {
  async fetch(request, env) {
    const relay = new CloudflareRelay(env);
    return relay.handleRequest(request);
  }
};