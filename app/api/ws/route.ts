// app/api/ws/route.ts
import { NextApiResponse } from 'next';
import type { WebSocket } from 'ws';
import { WebSocketServer } from 'ws'; 
import { RealtimeClient } from '@openai/realtime-api-beta';
import { IncomingMessage } from 'http';
import { WebSocketMessage, RealtimeEvent, ToolDefinition } from '@/lib/realtime/types';

let wss: WebSocketServer | null = null;

export async function GET(req: Request) {
  // This is needed for WebSocket upgrade
  const { socket: res } = (process as any).env;
  const server = (res as any).server;
  
  if (!wss) {
    wss = new WebSocketServer({ 
      server,
      path: '/api/ws'
    });

    wss.on('connection', handleConnection);
  }

  // Return a response to keep the connection alive
  const response = new Response(null);
  response.headers.set('Upgrade', 'websocket');
  response.headers.set('Connection', 'Upgrade');
  return response;
}

async function handleConnection(ws: WebSocket) {
  if (!process.env.OPENAI_API_KEY) {
    ws.close(1011, 'Server configuration error: OPENAI_API_KEY not set');
    return;
  }

  const client = new RealtimeClient({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  // Handle OpenAI events
  client.on('realtime.event', (event: RealtimeEvent) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'realtime.event',
        event
      }));
    }
  });

  client.on('conversation.updated', (event: RealtimeEvent) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'conversation.updated',
        event
      }));
    }
  });

  client.on('conversation.interrupted', () => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'conversation.interrupted'
      }));
    }
  });

  const messageQueue: string[] = [];

  const messageHandler = async (data: string) => {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      
      switch (message.type) {
        case 'connect':
          await client.connect();
          if (message.data) {
            await client.updateSession(message.data);
          }
          break;

        case 'disconnect':
          await client.disconnect();
          break;

        case 'update_session':
          await client.updateSession(message.data);
          break;

        case 'append_audio':
          client.appendInputAudio(new Int16Array(message.data));
          break;

        case 'create_response':
          await client.createResponse();
          break;

        case 'user_message':
          if ('data' in message) {
            client.sendUserMessageContent(message.data);
          }
          break;

        case 'cancel_response':
          if ('id' in message && 'offset' in message && message.id && message.offset) {
            await client.cancelResponse(message.id, message.offset);
          }
          break;

        case 'add_tool':
          if ('tool' in message && message.tool) {
            const toolDef = message.tool as ToolDefinition;
            client.addTool(toolDef, async (params: Record<string, any>) => {
              ws.send(JSON.stringify({
                type: 'tool_call',
                tool: toolDef.name,
                params
              }));

              return new Promise((resolve) => {
                const responseHandler = (responseData: string) => {
                  const response = JSON.parse(responseData) as WebSocketMessage;
                  if (response.type === 'tool_response' && 
                      'tool' in response && 
                      response.tool === toolDef.name) {
                    ws.removeListener('message', responseHandler);
                    resolve(response.result);
                  }
                };
                ws.on('message', responseHandler);
              });
            });
          }
          break;
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  ws.on('message', (data: WSData) => {
    if (!client.isConnected()) {
      messageQueue.push(data.toString());
    } else {
      messageHandler(data.toString());
    }
  });

  ws.on('close', () => {
    client.disconnect();
  });

  try {
    await client.connect();
    while (messageQueue.length > 0) {
      const message = messageQueue.shift();
      if (message) await messageHandler(message);
    }
  } catch (error) {
    console.error('Error connecting to OpenAI:', error);
    ws.close(1011, 'Failed to connect to OpenAI');
  }
}


// Add this to handle cleanup
export async function DELETE() {
    if (wss) {
      wss.close();
      wss = null;
    }
    return new Response(null, { status: 200 });
  }
  

export const config = {
  api: {
    bodyParser: false,
  },
};