// app/api/daily-bot/route.ts
import { NextResponse } from 'next/server';
import { defaultBotProfile, defaultMaxDuration } from '@/rtvi.config';

export async function POST(request: Request) {
  console.log('[API] Received POST request to /api/daily-bot');
  
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  
  try {
    const body = await request.json();
    console.log('[API] Request body:', body);
    
    const { services, config } = body;

    if (!services || !config || !process.env.DAILY_BOTS_URL) {
      console.error('[API] Missing required parameters:', { services, config, hasUrl: !!process.env.DAILY_BOTS_URL });
      return NextResponse.json(
        { error: 'Services or config not found on request body' }, 
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const payload = {
      bot_profile: defaultBotProfile,
      max_duration: defaultMaxDuration,
      services,
      config: [...config],
    };

    console.log('[API] Sending request to Daily Bots URL:', process.env.DAILY_BOTS_URL);
    console.log('[API] Payload:', payload);

    const req = await fetch(process.env.DAILY_BOTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DAILY_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const res = await req.json();
    console.log('[API] Daily Bots response:', { status: req.status, body: res });

    if (req.status !== 200) {
      console.error('[API] Error from Daily Bots:', res);
      return NextResponse.json(res, { 
        status: req.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return NextResponse.json(res, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}