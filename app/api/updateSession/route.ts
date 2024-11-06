// app/api/updateSession/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withCombinedAuth } from "@/lib/combined-auth";
import db from "@/lib/db";
import { onboardingSessions } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id');

  return withCombinedAuth(req, async (userId, _) => {
    if (!agentId) {
      return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
    }

    try {
      const body = await req.json();
      const { sessionId, name } = body;

      if (!sessionId || !name) {
        return NextResponse.json({ 
          error: "Session ID and name are required" 
        }, { status: 400 });
      }

      // Verify session exists and belongs to agent
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

      // Update session name
      await db
        .update(onboardingSessions)
        .set({ 
          name,
          updatedAt: new Date()
        })
        .where(eq(onboardingSessions.id, sessionId));

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error updating session:', error);
      return NextResponse.json(
        { error: "Failed to update session" },
        { status: 500 }
      );
    }
  });
}