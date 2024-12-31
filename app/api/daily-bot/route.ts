// app/api/daily-bot/route.ts
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    const headersList = headers();
    const agentId = headersList.get('x-agent-id');
    const path = new URL(request.url).pathname.split('/daily-bot/')[1];
    
    // Validate environment variables
    if (!process.env.DAILY_BOTS_URL || !process.env.DAILY_BOTS_API_KEY) {
      throw new Error('Missing Daily Bots configuration');
    }

    if (!agentId) {
      throw new Error('Missing agent ID');
    }

    // Parse request body
    const { services = {}, config = [], rtvi_client_version } = await request.json();

    // Construct API endpoint URL
    const apiUrl = new URL(path || '', process.env.DAILY_BOTS_URL).toString();

    // Send request to Daily Bots API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DAILY_BOTS_API_KEY}`,
      },
      body: JSON.stringify({
        bot_profile: 'voice_2024_10',
        max_duration: 600,
        services: {
          ...services
        },
        api_keys: {
          openai: process.env.OPENAI_API_KEY,
          anthropic: process.env.ANTHROPIC_API_KEY,
          grok: process.env.GROK_API_KEY,
          gemini: process.env.GEMINI_API_KEY,
        },
        config: [
          ...config,
          {
            service: 'tts',
            options: [
              { name: 'model', value: 'sonic-english' },
              { name: 'language', value: 'en' }
            ]
          },
          {
            service: 'llm',
            options: [
              { 
                name: 'initial_messages', 
                value: [
                  {
                    role: 'system',
                    content: 'You are a helpful assistant that communicates clearly and concisely.'
                  }
                ]
              }
            ]
          }
        ],
        rtvi_client_version
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Daily Bot API Error:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      throw new Error(data.error || `Failed to ${path || 'initialize'} Daily Bot`);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Daily Bot API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}