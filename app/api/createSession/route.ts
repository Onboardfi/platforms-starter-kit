import { NextRequest, NextResponse } from "next/server";
import { createOnboardingSession, getAgentById, getSessions } from "@/lib/actions";
import { verifyOnboardingToken } from "@/lib/onboarding-auth";
import { checkSessionLimits, incrementSessionCount } from "@/lib/usage-limits";
// app/api/createSession/route.ts
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
    const isOneToOne = !agent.settings.allowMultipleSessions;
    const isAuthRequired = agent.settings.authentication?.enabled;

    // Get and verify onboarding token first
    const onboardingToken = req.cookies.get('onboarding_token')?.value;
    let authState = null;

    if (onboardingToken) {
      authState = await verifyOnboardingToken(onboardingToken);
    }

    // Check authentication for protected agents
    if (isAuthRequired && (!authState || !authState.isAuthenticated)) {
      return NextResponse.json({
        error: "Authentication required",
        success: false,
        requiresAuth: true,
        authMessage: agent.settings.authentication?.message
      }, { status: 401 });
    }

    // Check session limits
    const limits = await checkSessionLimits(organizationId);

    // For one-to-one sessions, check if one already exists
    if (isOneToOne) {
      const existingSessions = await getSessions(agentId, organizationId);
      if (existingSessions.length > 0) {
        return NextResponse.json({
          sessionId: existingSessions[0].id,
          success: true,
          existing: true,
          usage: {
            current: existingSessions.length,
            max: limits.maxAllowed
          }
        });
      }
    }
    
    if (!limits.canCreate) {
      return NextResponse.json({
        error: `Session limit reached. Your ${limits.tier} plan allows ${limits.maxAllowed} sessions.`,
        success: false,
        limits
      }, { status: 403 });
    }

    const sessionAuthState = {
      isAuthenticated: authState?.isAuthenticated || false,
      isAnonymous: !isAuthRequired && agent.settings.onboardingType === 'external',
      organizationId
    };

    // Create the session
    const sessionId = await createOnboardingSession(agentId, {
      name: body.name || 'New Session',
      type: agent.settings.onboardingType || 'external',
      authState: sessionAuthState
    });

    // Increment session count after successful creation
    await incrementSessionCount(organizationId);

    return NextResponse.json({ 
      sessionId,
      success: true,
      usage: {
        current: limits.currentCount + 1,
        max: limits.maxAllowed
      }
    });

  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      success: false
    }, { status: 500 });
  }
}