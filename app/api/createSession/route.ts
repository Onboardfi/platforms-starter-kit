///Users/bobbygilbert/Documents/Github/platforms-starter-kit/app/api/createSession/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createOnboardingSession, getAgentById } from "@/lib/actions";
import { verifyOnboardingToken } from "@/lib/onboarding-auth";
import db from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const agentId = body.agentId;

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID required", success: false }, 
        { status: 400 }
      );
    }

    // Get agent to check settings
    const agent = await getAgentById(agentId);
    if (!agent || !agent.site) {
      console.warn(`Agent not found: ${agentId}`);
      return NextResponse.json(
        { error: "Agent not found", success: false }, 
        { status: 404 }
      );
    }

    const organizationId = agent.site.organizationId;
    console.log('Retrieved organization context:', { 
      agentId, 
      organizationId,
      hasSite: !!agent.site
    });

    // Get the onboarding token to check authentication state
    const onboardingToken = req.cookies.get('onboarding_token')?.value;
    let authState = null;
    if (onboardingToken) {
      authState = await verifyOnboardingToken(onboardingToken);
      console.log('Verified onboarding token:', { 
        tokenExists: !!onboardingToken,
        authState 
      });
    }

    try {
      const sessionId = await createOnboardingSession(agentId, {
        name: body.name || 'New Session',
        type: body.type || 'external',
        authState: {
          isAuthenticated: authState?.isAuthenticated || false,
          isAnonymous: authState?.isAnonymous || true,
          organizationId // Pass the organization ID from the agent
        }
      });

      console.log('Session created successfully:', {
        sessionId,
        agentId,
        organizationId,
        authState: {
          isAuthenticated: authState?.isAuthenticated || false,
          isAnonymous: authState?.isAnonymous || true,
          organizationId
        }
      });

      return NextResponse.json({ 
        sessionId,
        success: true 
      });

    } catch (error) {
      console.error('Failed to create session:', {
        error,
        agentId,
        organizationId,
        tokenExists: !!onboardingToken,
        authState
      });

      return NextResponse.json({
        error: error instanceof Error ? error.message : 'Failed to create session',
        success: false
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Create session route error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      success: false
    }, { status: 500 });
  }
}