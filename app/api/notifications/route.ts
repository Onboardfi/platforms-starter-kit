//app/api/notifications/route.ts

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { title, content, userId } = await req.json();
    
    // You'll replace this with your Novu API key
    const apiKey = process.env.NOVU_API_KEY;
    
    const response = await fetch('https://api.novu.co/v1/events/trigger', {
      method: 'POST',
      headers: {
        'Authorization': `ApiKey ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'onboarding-complete-owner', // Your workflow name
        to: userId,
        payload: {
          title,
          content
        }
      })
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}