// app/api/deleteSession/route.ts
import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/actions";
import { withCombinedAuth } from "@/lib/combined-auth";
import db from "@/lib/db";
import { onboardingSessions } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(req: NextRequest) {
  // Get agentId from both headers and query params
  const agentId = req.headers.get('x-agent-id') || new URL(req.url).searchParams.get('agentId');

  return withCombinedAuth(req, async (userId, _) => {
    if (!agentId) {
      console.error('Agent ID missing in delete session request');
      return NextResponse.json({ 
        error: "Agent ID required", 
        details: "Agent ID must be provided in headers or query parameters" 
      }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    try {
      // Verify the session belongs to the agent before deletion
      const session = await db.query.onboardingSessions.findFirst({
        where: and(
          eq(onboardingSessions.id, sessionId),
          eq(onboardingSessions.agentId, agentId)
        )
      });

      if (!session) {
        return NextResponse.json({ 
          error: "Session not found or doesn't belong to this agent" 
        }, { status: 404 });
      }

      await deleteSession(sessionId);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting session:', error);
      return NextResponse.json(
        { error: "Failed to delete session" },
        { status: 500 }
      );
    }
  });
}