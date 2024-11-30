///Users/bobbygilbert/Documents/Github/platforms-starter-kit/app/api/createSession/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createOnboardingSession, getAgentById } from "@/lib/actions";
import { verifyOnboardingToken } from "@/lib/onboarding-auth";
import { checkSessionLimits, incrementSessionCount } from "@/lib/usage-limits";

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
    
    // Check session limits before creating
    const limits = await checkSessionLimits(organizationId);
    
    if (!limits.canCreate) {
      return NextResponse.json({
        error: `Session limit reached. Your ${limits.tier} plan allows ${limits.maxAllowed} sessions. Please upgrade to create more sessions.`,
        success: false,
        limits
      }, { status: 403 });
    }

    // Get the onboarding token to check authentication state
    const onboardingToken = req.cookies.get('onboarding_token')?.value;
    let authState = null;
    if (onboardingToken) {
      authState = await verifyOnboardingToken(onboardingToken);
    }

    try {
      const sessionId = await createOnboardingSession(agentId, {
        name: body.name || 'New Session',
        type: body.type || 'external',
        authState: {
          isAuthenticated: authState?.isAuthenticated || false,
          isAnonymous: authState?.isAnonymous || true,
          organizationId
        }
      });

      // Increment session count after successful creation
      await incrementSessionCount(organizationId);

      console.log('Session created successfully:', {
        sessionId,
        agentId,
        organizationId,
        currentCount: limits.currentCount + 1
      });

      return NextResponse.json({ 
        sessionId,
        success: true,
        usage: {
          current: limits.currentCount + 1,
          max: limits.maxAllowed
        }
      });

    } catch (error) {
      console.error('Failed to create session:', {
        error,
        agentId,
        organizationId
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