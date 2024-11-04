// app/api/saveMessage/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withCombinedAuth } from "@/lib/combined-auth";
import { addMessage } from "@/lib/actions";
import { eq } from "drizzle-orm";
import db from "@/lib/db";
import { conversations, messages } from "@/lib/schema";
import { MessageType, MessageRole, MessageContent, MessageMetadata } from "@/lib/types";

export async function POST(req: NextRequest) {
  return withCombinedAuth(req, async (userId, agentId) => {
    try {
      const body = await req.json();
      const { conversationId, message } = body;

      if (!conversationId) {
        return NextResponse.json(
          { error: "Conversation ID required" }, 
          { status: 400 }
        );
      }

      // Verify conversation exists
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId)
      });

      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }

      // Save message
      try {
        const savedMessage = await addMessage(
          conversationId,
          message.content.transcript ? 'transcript' as MessageType : 'text' as MessageType,
          message.role as MessageRole,
          {
            text: message.content.text,
            transcript: message.content.transcript,
            audioUrl: message.content.audioUrl
          } as MessageContent,
          message.metadata as MessageMetadata,
          message.parentMessageId,
          message.stepId
        );

        console.log('Saved message:', {
          conversationId,
          messageId: savedMessage.id,
          role: savedMessage.role,
          type: savedMessage.type
        });

        return NextResponse.json({
          success: true,
          message: savedMessage
        });

      } catch (error) {
        console.error('Failed to save message:', error);
        throw error;
      }

    } catch (error) {
      console.error('Error in saveMessage handler:', error);
      return NextResponse.json(
        { error: "Failed to save message" },
        { status: 500 }
      );
    }
  });
}

// GET endpoint to fetch messages for a conversation
export async function GET(req: NextRequest) {
  return withCombinedAuth(req, async (userId, agentId) => {
    try {
      const conversationId = req.nextUrl.searchParams.get('conversationId');

      if (!conversationId) {
        return NextResponse.json(
          { error: "Conversation ID required" },
          { status: 400 }
        );
      }

      // Get messages ordered by orderIndex
      const messageList = await db.query.messages.findMany({
        where: eq(messages.conversationId, conversationId),
        orderBy: (messages, { asc }) => [asc(messages.orderIndex)],
      });

      return NextResponse.json({
        messages: messageList,
        count: messageList.length
      });

    } catch (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }
  });
}