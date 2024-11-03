// app/api/getSessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessions } from "@/lib/actions";
import { withCombinedAuth } from "@/lib/combined-auth";

export async function GET(req: NextRequest) {
  return withCombinedAuth(req, async (userId, agentId) => {
    if (!agentId) {
      console.warn('Agent ID missing in getSessions handler.');
      return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
    }

    try {
      const sessions = await getSessions(agentId);
      console.log(`Fetched ${sessions.length} sessions for agent: ${agentId}`);
      return NextResponse.json({ sessions });
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json(
        { error: "Internal server error" }, 
        { status: 500 }
      );
    }
  });
}