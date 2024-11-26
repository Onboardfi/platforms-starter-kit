import { NextRequest, NextResponse } from "next/server";
import { withCombinedAuth } from "@/lib/combined-auth";
import { createConversation, getSessionConversations } from "@/lib/actions";
import { eq, and } from "drizzle-orm";
import db from "@/lib/db";
import { conversations, onboardingSessions } from "@/lib/schema";

export async function POST(req: NextRequest) {
  console.log('POST /api/getOrCreateConversation called');

  return withCombinedAuth(req, async (userId, agentId, authState) => {
    console.log('withCombinedAuth - userId:', userId, 'agentId:', agentId, 'authState:', authState);

    const body = await req.json();
    console.log('Request Body:', body);
    const effectiveAgentId = agentId || body.agentId;

    if (!effectiveAgentId) {
      console.warn('Agent ID missing in getOrCreateConversation handler.');
      return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
    }

    if (!authState?.organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 401 }
      );
    }

    try {
      const { sessionId } = body;
      if (!sessionId) {
        console.warn('Session ID missing');
        return NextResponse.json(
          { error: "Session ID required" }, 
          { status: 400 }
        );
      }

      // Verify session belongs to agent and organization
      const session = await db.query.onboardingSessions.findFirst({
        where: and(
          eq(onboardingSessions.id, sessionId),
          eq(onboardingSessions.agentId, effectiveAgentId),
          eq(onboardingSessions.organizationId, authState.organizationId)
        ),
      });

      if (!session) {
        console.warn('Invalid session or unauthorized access');
        return NextResponse.json(
          { error: "Invalid session or unauthorized access" },
          { status: 404 }
        );
      }

      // Try to find an active conversation
      const existingConversations = await getSessionConversations(
        sessionId, 
        'active'
      );

      let conversation = existingConversations[0];

      // Create new conversation if needed
      if (!conversation) {
        try {
          conversation = await createConversation(sessionId, {
            agentVersion: '1.0',
            clientType: 'web',
            sessionType: authState.isAnonymous ? 'external' : 'internal',
            messageCount: 0,
            isAnonymous: authState.isAnonymous,
            isAuthenticated: authState.isAuthenticated,
            organizationId: authState.organizationId
          });

          console.log('Created new conversation:', {
            id: conversation.id,
            sessionId,
            type: authState.isAnonymous ? 'external' : 'internal',
            organizationId: authState.organizationId
          });
        } catch (error) {
          console.error('Error creating conversation:', error);
          throw new Error('Failed to create new conversation');
        }
      }

      return NextResponse.json({
        conversationId: conversation.id,
        isNew: !existingConversations[0],
        messageCount: conversation.messageCount,
        status: conversation.status
      });

    } catch (error) {
      console.error('Error in getOrCreateConversation:', error);
      return NextResponse.json(
        { error: "Internal server error" }, 
        { status: 500 }
      );
    }
  });
}

export async function GET(req: NextRequest) {
  console.log('GET /api/getOrCreateConversation called');

  return withCombinedAuth(req, async (userId, agentId, authState) => {
    console.log('withCombinedAuth - userId:', userId, 'agentId:', agentId, 'authState:', authState);

    if (!authState?.organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 401 }
      );
    }

    const effectiveAgentId = agentId || req.nextUrl.searchParams.get('agentId');
    if (!effectiveAgentId) {
      console.warn('Agent ID missing');
      return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
    }

    try {
      const sessionId = req.nextUrl.searchParams.get('sessionId');
      if (!sessionId) {
        console.warn('Session ID missing');
        return NextResponse.json(
          { error: "Session ID required" }, 
          { status: 400 }
        );
      }

      // Verify session belongs to agent and organization
      const session = await db.query.onboardingSessions.findFirst({
        where: and(
          eq(onboardingSessions.id, sessionId),
          eq(onboardingSessions.agentId, effectiveAgentId),
          eq(onboardingSessions.organizationId, authState.organizationId)
        ),
      });

      if (!session) {
        console.warn('Invalid session or unauthorized access');
        return NextResponse.json(
          { error: "Invalid session or unauthorized access" },
          { status: 404 }
        );
      }

      const conversations = await getSessionConversations(sessionId);
      return NextResponse.json({ 
        conversations,
        count: conversations.length 
      });

    } catch (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json(
        { error: "Internal server error" }, 
        { status: 500 }
      );
    }
  });
}