// app/api/getOrCreateConversation/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withCombinedAuth } from "@/lib/combined-auth";
import { createConversation, getSessionConversations } from "@/lib/actions";
import { eq, and } from "drizzle-orm";
import db from "@/lib/db";
import { conversations, onboardingSessions } from "@/lib/schema";
import { createId } from '@paralleldrive/cuid2';

export async function POST(req: NextRequest) {
  console.log('POST /api/getOrCreateConversation called');

  return withCombinedAuth(req, async (userId, agentId, authState) => {
    console.log('withCombinedAuth - userId:', userId, 'agentId:', agentId, 'authState:', authState);

    // Get agentId from headers or body
    const body = await req.json();
    console.log('Request Body:', body);
    const effectiveAgentId = agentId || body.agentId;

    if (!effectiveAgentId) {
      console.warn('Agent ID missing in getOrCreateConversation handler.');
      return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
    }

    try {
      const { sessionId } = body;
      console.log('Session ID:', sessionId);

      if (!sessionId) {
        console.warn('Session ID missing');
        return NextResponse.json(
          { error: "Session ID required" }, 
          { status: 400 }
        );
      }

      // Verify session belongs to agent
      const session = await db.query.onboardingSessions.findFirst({
        where: and(
          eq(onboardingSessions.id, sessionId),
          eq(onboardingSessions.agentId, effectiveAgentId)
        ),
      });
      console.log('Session Found:', session);

      if (!session) {
        console.warn('Invalid session');
        return NextResponse.json(
          { error: "Invalid session" },
          { status: 404 }
        );
      }

      // Try to find an active conversation first
      const existingConversations = await getSessionConversations(
        sessionId, 
        'active'
      );
      console.log('Existing Conversations:', existingConversations);

      let conversation = existingConversations[0];

      // If no active conversation exists, create a new one
      if (!conversation) {
        try {
          conversation = await createConversation(sessionId, {
            agentVersion: '1.0',
            clientType: 'web',
            sessionType: 'internal',
            messageCount: 0,
          });

          console.log(`Created new conversation for session ${sessionId}:`, conversation);
        } catch (error) {
          console.error('Error creating conversation:', error);
          throw new Error('Failed to create new conversation');
        }
      }

      // Log the active conversation
      console.log(`Active conversation for session ${sessionId}:`, {
        conversationId: conversation.id,
        messageCount: conversation.messageCount,
        status: conversation.status,
        agentId: effectiveAgentId
      });

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

    const effectiveAgentId = agentId || req.nextUrl.searchParams.get('agentId');
    console.log('Effective Agent ID:', effectiveAgentId);

    if (!effectiveAgentId) {
      console.warn('Agent ID missing in getOrCreateConversation handler.');
      return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
    }

    try {
      const sessionId = req.nextUrl.searchParams.get('sessionId');
      console.log('Session ID:', sessionId);

      if (!sessionId) {
        console.warn('Session ID missing');
        return NextResponse.json(
          { error: "Session ID required" }, 
          { status: 400 }
        );
      }

      // Verify session belongs to agent
      const session = await db.query.onboardingSessions.findFirst({
        where: and(
          eq(onboardingSessions.id, sessionId),
          eq(onboardingSessions.agentId, effectiveAgentId)
        ),
      });
      console.log('Session Found:', session);

      if (!session) {
        console.warn('Invalid session');
        return NextResponse.json(
          { error: "Invalid session" },
          { status: 404 }
        );
      }

      const conversations = await getSessionConversations(sessionId);
      console.log('Conversations:', conversations);

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