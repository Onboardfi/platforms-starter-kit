// app/api/getConversationMessages/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withCombinedAuth } from "@/lib/combined-auth";
import db from "@/lib/db";
import { conversations, messages, onboardingSessions } from "@/lib/schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  return withCombinedAuth(req, async (userId, agentId) => {
    try {
      // Get URL parameters
      const conversationId = req.nextUrl.searchParams.get('conversationId');
      const sessionId = req.nextUrl.searchParams.get('sessionId');
      
      // Validate required parameters
      if (!conversationId) {
        console.warn('Conversation ID missing in getConversationMessages handler.');
        return NextResponse.json(
          { error: "Conversation ID required" },
          { status: 400 }
        );
      }

      // If sessionId provided, verify session belongs to agent
      if (sessionId && agentId) {
        const session = await db.query.onboardingSessions.findFirst({
          where: and(
            eq(onboardingSessions.id, sessionId),
            eq(onboardingSessions.agentId, agentId as string)
          ),
        });

        if (!session) {
          console.warn(`Invalid session (${sessionId}) for agent ${agentId}`);
          return NextResponse.json(
            { error: "Invalid session" },
            { status: 404 }
          );
        }

        // Verify conversation belongs to session
        const conversation = await db.query.conversations.findFirst({
          where: and(
            eq(conversations.id, conversationId),
            eq(conversations.sessionId, sessionId)
          ),
        });

        if (!conversation) {
          console.warn(`Conversation ${conversationId} not found for session ${sessionId}`);
          return NextResponse.json(
            { error: "Conversation not found for session" },
            { status: 404 }
          );
        }
      }

      // Get messages with optional pagination parameters
      const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
      const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');
      const afterId = req.nextUrl.searchParams.get('afterId');

      // Build query conditions
      const conditions = [eq(messages.conversationId, conversationId)];

      if (afterId) {
        const afterMessage = await db.query.messages.findFirst({
          where: eq(messages.id, afterId),
        });
        if (afterMessage) {
          conditions.push(eq(messages.orderIndex, afterMessage.orderIndex));
        }
      }

      // Fetch messages
      const messageList = await db.query.messages.findMany({
        where: and(...conditions),
        orderBy: [asc(messages.orderIndex)],
        limit,
        offset,
        with: {
          step: true,
          parentMessage: true
        }
      });

      // Get conversation for total count
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
        columns: {
          messageCount: true
        }
      });

      // Transform messages to ensure consistent format
      const formattedMessages = messageList.map(msg => ({
        id: msg.id,
        conversationId: msg.conversationId,
        type: msg.type,
        role: msg.role,
        content: {
          text: msg.content.text || '',
          audioUrl: msg.content.audioUrl,
          transcript: msg.content.transcript
        },
        metadata: {
          ...msg.metadata,
          stepTitle: msg.metadata?.stepTitle,
          isFinal: msg.metadata?.isFinal || false,
          clientId: msg.metadata?.clientId,
          toolCalls: msg.metadata?.toolCalls || []
        },
        toolCalls: msg.toolCalls || [],
        stepId: msg.stepId,
        step: msg.step,
        orderIndex: msg.orderIndex,
        parentMessageId: msg.parentMessageId,
        parentMessage: msg.parentMessage,
        createdAt: msg.createdAt
      }));

      console.log(`Fetched ${formattedMessages.length} messages for conversation: ${conversationId}`);

      return NextResponse.json({
        messages: formattedMessages,
        pagination: {
          limit,
          offset,
          total: conversation?.messageCount || formattedMessages.length,
          hasMore: formattedMessages.length === limit
        }
      });

    } catch (error) {
      console.error('Error in getConversationMessages:', error);
      return NextResponse.json(
        { error: "Failed to fetch conversation messages" },
        { status: 500 }
      );
    }
  });
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-agent-id',
    },
  });
}