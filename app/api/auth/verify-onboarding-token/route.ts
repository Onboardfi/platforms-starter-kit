// app/api/auth/verify-onboarding-token/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verifyOnboardingToken, generateOnboardingToken } from "@/lib/onboarding-auth";
import { getAgentById } from "@/lib/actions";

// Enable CORS for development
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
    // 1. Get and validate agent ID
    const agentId = req.headers.get('x-agent-id') || req.nextUrl.searchParams.get('agentId');
    if (!agentId) {
      console.warn('No agent ID provided in verification request');
      return NextResponse.json({ 
        error: "Agent ID required",
        success: false 
      }, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // 2. Get agent to check settings
    const agent = await getAgentById(agentId);
    if (!agent) {
      console.warn(`Agent not found: ${agentId}`);
      return NextResponse.json({ 
        error: "Agent not found",
        success: false 
      }, { 
        status: 404,
        headers: corsHeaders 
      });
    }

    // 3. Check for existing token
    const token = req.cookies.get('onboarding_token')?.value;
    const isInternalOnboarding = agent.settings.onboardingType === 'internal';
    const isAuthEnabled = agent.settings.authentication?.enabled;

    if (token) {
      // 4. Verify existing token
      const authState = await verifyOnboardingToken(token);
      if (authState && authState.agentId === agentId) {
        // Token is valid and matches agent
        return NextResponse.json({ 
          success: true, 
          userId: authState.userId,
          agentId: authState.agentId,
          isAnonymous: authState.isAnonymous || false,
          isAuthenticated: authState.isAuthenticated || false
        }, { headers: corsHeaders });
      }
      
      // Token is invalid or doesn't match agent - clear it
      const response = NextResponse.json({ 
        error: "Invalid token",
        success: false,
        requiresAuth: isInternalOnboarding && isAuthEnabled,
        agentId: agent.id,
        agentName: agent.name,
        authMessage: agent.settings.authentication?.message
      }, { 
        status: 401,
        headers: corsHeaders 
      });
      response.cookies.delete('onboarding_token');
      return response;
    }

    // 5. No token exists - handle based on agent settings
    console.log(`No token found for agent ${agentId}. Auth enabled: ${isAuthEnabled}`);

    // For internal onboarding with auth enabled, require authentication
    if (isInternalOnboarding && isAuthEnabled) {
      return NextResponse.json({ 
        error: "Authentication required",
        success: false,
        requiresAuth: true,
        agentId: agent.id,
        agentName: agent.name,
        authMessage: agent.settings.authentication.message
      }, { 
        status: 401,
        headers: corsHeaders 
      });
    }

    // 6. For external onboarding or when auth is disabled, create anonymous session
    const anonymousToken = await generateOnboardingToken({
      userId: 'anonymous',
      agentId,
      isAnonymous: true,
      isAuthenticated: false,
      organizationId: null // Provide organizationId as null
    });
    
    const response = NextResponse.json({ 
      success: true, 
      userId: 'anonymous',
      agentId,
      isAnonymous: true,
      isAuthenticated: false,
      tokenCreated: true
    }, { headers: corsHeaders });

    // Set the new anonymous token
    response.cookies.set('onboarding_token', anonymousToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error("Token verification error:", error);
    return NextResponse.json(
      { error: "Internal server error", success: false }, 
      { status: 500, headers: corsHeaders }
    );
  }
}
