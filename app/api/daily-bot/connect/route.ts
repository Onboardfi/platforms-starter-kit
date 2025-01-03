
///Users/bobbygilbert/Documents/GitHub/platforms-starter-kit/app/api/daily-bot/connect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { defaultBotProfile, defaultMaxDuration, defaultServices, defaultConfig } from '@/rtvi.config';
// /api/daily-bot/connect/route.ts
export async function POST(request: NextRequest) {
    try {
      if (!process.env.DAILY_BOTS_URL || !process.env.DAILY_API_KEY) {
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
      }
  
      const body = await request.json();
      console.log('Request body:', JSON.stringify(body, null, 2));
  
      // Handle initial connect request (no rtvi_client_version)
      if (!body.rtvi_client_version) {
        const payload = {
          bot_profile: "voice_2024_10",
          max_duration: defaultMaxDuration,
          services: {
            stt: "deepgram",
            llm: "anthropic",
            tts: "cartesia"
          },
          config: body.config || defaultConfig
        };
  
        const response = await fetch('https://api.daily.co/v1/bots/start', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.DAILY_API_KEY}`,
          },
          body: JSON.stringify(payload),
        });
  
        const data = await response.json();
        console.log('Daily API response:', data); // Add this log
  
        if (!response.ok) {
          console.error('Daily API error:', data);
          return NextResponse.json({ error: data.error || "API request failed" }, { status: response.status });
        }
  
        return NextResponse.json({
          token: data.token,
          roomUrl: data.room_url // Keep both properties for compatibility
        });
      }
  
      // Handle subsequent connect requests
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error:', error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }