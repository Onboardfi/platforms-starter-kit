// app/api/daily-bot/debug/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasUrl: !!process.env.DAILY_BOTS_URL,
    hasApiKey: !!process.env.DAILY_BOTS_API_KEY,
    url: process.env.NODE_ENV === 'development' ? process.env.DAILY_BOTS_URL : undefined
  });
}