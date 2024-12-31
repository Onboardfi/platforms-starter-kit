// File: /Users/bobbygilbert/Documents/GitHub/platforms-starter-kit/app/api/daily-bot/[...path]/route.ts

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    // 1. Access Next.js-ified headers
    const headersList = headers();
    let agentId = headersList.get('x-agent-id');

    // 2. Parse JSON body (only do request.json() once)
    const body = await request.json();
    const requestData = body.requestData || {};

    // 3. If x-agent-id missing, fallback to requestData.agentId
    if (!agentId) {
      agentId = requestData.agentId || null;
    }

    if (!agentId) {
      console.error('Missing agent ID in request', {
        headers: Object.fromEntries(request.headers.entries()),
        headersList: Object.fromEntries(headersList.entries()),
      });
      throw new Error('Missing agent ID in request');
    }

    // 4. The `[...path]` catch-all
    const subPath = params.path.join('/') || 'connect';

    // 5. Validate environment
    if (!process.env.DAILY_BOTS_URL || !process.env.DAILY_BOTS_API_KEY) {
      throw new Error('Missing Daily Bots configuration');
    }

    // 6. Extract from requestData
    const { services, config, rtvi_client_version } = requestData;
    if (!services || !config) {
      throw new Error('Missing services/config in request body');
    }

    // 7. Build final URL
    const apiUrl = new URL(subPath, process.env.DAILY_BOTS_URL).toString();

    // 8. Forward request to the upstream Daily Bots endpoint
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DAILY_BOTS_API_KEY}`,
        // Re-include the agentId if you want to see it downstream
        'x-agent-id': agentId,
      },
      body: JSON.stringify({
        bot_profile: 'voice_2024_10',
        max_duration: 600,
        services,
        api_keys: {
          openai: process.env.OPENAI_API_KEY,
          anthropic: process.env.ANTHROPIC_API_KEY,
          grok: process.env.GROK_API_KEY,
          gemini: process.env.GEMINI_API_KEY,
        },
        config,
        rtvi_client_version,
        agentId,
      }),
    });

    // 9. Return JSON response
    const data = await response.json();
    if (!response.ok) {
      console.error('Upstream Daily Bots error response:', data);
      throw new Error(
        data.error || `Failed to ${subPath} Daily Bot (status ${response.status})`
      );
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
