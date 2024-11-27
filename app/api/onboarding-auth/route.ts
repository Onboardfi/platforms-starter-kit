// app/api/onboarding-auth/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { generateOnboardingToken } from "@/lib/onboarding-auth";
import { getAgentById } from "@/lib/actions";

export async function GET(req: NextRequest) {
  try {
    // 1. Get the Next Auth token
    const token = await getToken({ req });
    if (!token?.sub) {
      console.log('No valid NextAuth session found');
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // 2. Get and validate agent ID
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    if (!agentId) {
      return NextResponse.json({ 
        error: 'Agent ID required',
        success: false 
      }, { 
        status: 400 
      });
    }

    // 3. Get agent and verify settings
    const agent = await getAgentById(agentId);
    if (!agent) {
      console.warn(`Agent not found: ${agentId}`);
      return NextResponse.json({ 
        error: 'Agent not found',
        success: false 
      }, { 
        status: 404 
      });
    }

    // 4. Verify agent type and authentication settings
    const isInternalOnboarding = agent.settings.onboardingType === 'internal';
    const isAuthEnabled = agent.settings.authentication?.enabled;

    if (!isInternalOnboarding) {
      console.warn(`Invalid agent type for authentication: ${agent.settings.onboardingType}`);
      return NextResponse.json({ 
        error: 'Invalid agent type for authentication',
        success: false 
      }, { 
        status: 400 
      });
    }

    const organizationId = agent.site?.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID not found' }, { status: 400 });
    }
    
    const onboardingToken = await generateOnboardingToken({
      userId: token.sub,
      agentId,
      isAnonymous: false,
      isAuthenticated: true,
      organizationId,
    });
    
    // 6. Create response with redirect
    const response = NextResponse.redirect(new URL(`/onboard/${agentId}`, req.url));

    // 7. Set the token cookie
    response.cookies.set('onboarding_token', onboardingToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Onboarding auth error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      success: false 
    }, { 
      status: 500 
    });
  }
}