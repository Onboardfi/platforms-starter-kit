///Users/bobbygilbert/Documents/Github/platforms-starter-kit/app/api/getSessions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getSessions, getAgentById } from "@/lib/actions";
import { verifyOnboardingToken } from "@/lib/onboarding-auth";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-agent-id',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    const agentId = req.nextUrl.searchParams.get('agentId');
    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get the agent first to determine its organization
    const agent = await getAgentById(agentId);
    if (!agent || !agent.site) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const agentOrgId = agent.site.organizationId;

    // Check auth methods in order:
    // 1. Server session
    const serverSession = await getServerSession(authOptions);
    if (serverSession?.organizationId === agentOrgId) {
      const sessions = await getSessions(agentId, agentOrgId);
      return NextResponse.json({ sessions }, { headers: corsHeaders });
    }

    // 2. Onboarding token
    const onboardingToken = req.cookies.get('onboarding_token')?.value;
    if (onboardingToken) {
      try {
        const verifiedToken = await verifyOnboardingToken(onboardingToken);
        // Check for null and verify token properties
        if (verifiedToken && 
            verifiedToken.agentId && 
            verifiedToken.organizationId && 
            verifiedToken.agentId === agentId && 
            verifiedToken.organizationId === agentOrgId) {
          const sessions = await getSessions(agentId, agentOrgId);
          return NextResponse.json({ sessions }, { headers: corsHeaders });
        }
      } catch (e) {
        console.warn('Failed to verify onboarding token:', e);
      }
    }

    // No valid authentication
    return NextResponse.json(
      { 
        error: "Unauthorized",
        details: "Valid server session or onboarding token required"
      },
      { 
        status: 401, 
        headers: corsHeaders 
      }
    );

  } catch (error) {
    console.error('getSessions failed:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
}