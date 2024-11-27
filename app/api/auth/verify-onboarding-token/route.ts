///Users/bobbygilbert/Documents/Github/platforms-starter-kit/app/api/auth/verify-onboarding-token/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verifyOnboardingToken, generateOnboardingToken } from "@/lib/onboarding-auth";
import { getAgentById } from "@/lib/actions";
import { getToken } from "next-auth/jwt";
import db from '@/lib/db';
import { eq } from 'drizzle-orm';
import { agents, sites } from '@/lib/schema';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-agent-id',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    const agentId = req.headers.get('x-agent-id') || req.nextUrl.searchParams.get('agentId');
    if (!agentId) {
      return NextResponse.json({ 
        error: "Agent ID required",
        success: false 
      }, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Try to verify existing token first
    const token = req.cookies.get('onboarding_token')?.value;
    if (token) {
      try {
        const verified = await verifyOnboardingToken(token);
        if (verified && verified.agentId === agentId) {
          return NextResponse.json({
            success: true,
            ...verified
          }, { headers: corsHeaders });
        }
      } catch (e) {
        // Token verification failed, continue to check agent authentication requirements
        console.log('Token verification failed:', e);
      }
    }

    // Get agent with full details
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, agentId),
      with: {
        site: {
          with: {
            organization: true,
          }
        }
      }
    });
    
    if (!agent || !agent.site || !agent.site.organizationId) {
      console.log('Agent not found or missing data:', {
        found: !!agent,
        hasSite: !!agent?.site,
        orgId: agent?.site?.organizationId
      });
      
      return NextResponse.json({ 
        error: "Agent not found",
        success: false 
      }, { 
        status: 404,
        headers: corsHeaders 
      });
    }

    // Check if agent requires password authentication
    if (agent.settings?.authentication?.enabled) {
      return NextResponse.json({
        success: false,
        requiresAuth: true,
        agentId: agent.id,
        agentName: agent.name,
        authMessage: agent.settings.authentication.message,
        organizationId: agent.site.organizationId
      }, { 
        status: 401,
        headers: corsHeaders 
      });
    }

    // If no authentication required, create anonymous token
    const organizationId = agent.site.organizationId;
    const anonymousToken = await generateOnboardingToken({
      userId: 'anonymous',
      agentId,
      organizationId,
      isAnonymous: true,
      isAuthenticated: false
    });

    const response = NextResponse.json({
      success: true,
      userId: 'anonymous',
      agentId,
      organizationId,
      isAnonymous: true,
      isAuthenticated: false,
      tokenCreated: true
    }, { headers: corsHeaders });

    response.cookies.set('onboarding_token', anonymousToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Token verification error:', error);
    console.error(error instanceof Error ? error.stack : 'Unknown error');
    return NextResponse.json({ 
      error: "Internal server error",
      success: false 
    }, { 
      status: 500,
      headers: corsHeaders 
    });
  }
}