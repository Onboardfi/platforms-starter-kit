import { RealtimeClient } from '@openai/realtime-api-beta';

export class CloudflareRelay {
  constructor(env) {
    this.env = env;
  }

  async handleRequest(request) {
    if (!this.env.OPENAI_API_KEY) {
      return new Response('OpenAI API key not configured', { status: 500 });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', {
        status: 426,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
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

    server.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      realtimeClient.disconnect();
    });

    try {
      await realtimeClient.connect();
      console.log('Connected to OpenAI Realtime API');
    } catch (error) {
      console.error('Failed to connect to OpenAI:', error);
      server.send(JSON.stringify({ 
        type: 'error', 
        message: 'Failed to connect to OpenAI Realtime API'
      }));
      server.close();
      return new Response('Failed to initialize OpenAI connection', { status: 500 });
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }
}

export default {
  async fetch(request, env) {
    const relay = new CloudflareRelay(env);
    return relay.handleRequest(request);
  }
};