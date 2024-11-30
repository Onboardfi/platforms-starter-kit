///Users/bobbygilbert/Documents/Github/platforms-starter-kit/app/api/tierUsage/route.ts


import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { checkAgentLimits, checkSessionLimits } from "@/lib/usage-limits";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json(
        { error: "Unauthorized or no organization context" },
        { status: 401 }
      );
    }

    // Get agent and session limits
    const [agentLimits, sessionLimits] = await Promise.all([
      checkAgentLimits(session.organizationId),
      checkSessionLimits(session.organizationId)
    ]);

    return NextResponse.json({
      agentCount: agentLimits.currentCount,
      maxAgents: agentLimits.maxAllowed,
      canCreateAgent: agentLimits.canCreate,
      agentTier: agentLimits.tier,
      sessionCount: sessionLimits.currentCount,
      maxSessions: sessionLimits.maxAllowed,
      canCreateSession: sessionLimits.canCreate,
      sessionTier: sessionLimits.tier,
      isAtLimit: agentLimits.currentCount >= agentLimits.maxAllowed,
      isNearLimit: agentLimits.currentCount >= agentLimits.maxAllowed - 1,
    });

  } catch (error) {
    console.error('Error fetching usage:', error);
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    );
  }
}