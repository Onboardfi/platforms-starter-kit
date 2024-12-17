// app/api/webhooks/onboarding/route.ts

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

const ZAPIER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/19167330/2s0zbp5/';

// Helper for CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Handle POST request
export async function POST(req: Request) {
  try {
    // Get payload
    const payload = await req.json();
    
    // Send to Zapier
    const response = await fetch(ZAPIER_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to send to Zapier: ${response.statusText}`);
    }

    // Return success with CORS headers
    return NextResponse.json(
      { success: true },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
}