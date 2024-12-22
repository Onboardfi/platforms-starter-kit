///Users/bobbygilbert/Documents/Github/platforms-starter-kit/app/api/novu/route.ts

import { NextResponse } from 'next/server';
import { Novu } from '@novu/node';

// Check for API key and throw error if not found
if (!process.env.NOVU_API_KEY) {
  throw new Error('NOVU_API_KEY is not defined in environment variables');
}

// Initialize Novu with proper configuration
const novu = new Novu(process.env.NOVU_API_KEY, {
  backendUrl: process.env.NOVU_API_URL || 'https://api.novu.co'
});

export async function POST(req: Request) {
  try {
    const { title, content, userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const result = await novu.trigger('notification-workflow', {
      to: {
        subscriberId: userId,
      },
      payload: {
        title: title || 'New Notification',
        content: content || '',
      },
    });

    return NextResponse.json({ 
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send notification' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Simple health check by listing first subscriber
    await novu.subscribers.list(0);
    return NextResponse.json({ 
      status: 'healthy',
      provider: 'novu'
    });
  } catch (error) {
    console.error('Novu health check failed:', error);
    return NextResponse.json(
      { status: 'unhealthy', error: 'Failed to connect to Novu' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}