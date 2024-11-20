// app/api/getMessage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withCombinedAuth } from "@/lib/combined-auth";
import db from "@/lib/db";
import { messages, conversations, onboardingSessions } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { MessageMetadata } from '@/lib/types';

export async function GET(req: NextRequest) {
  return withCombinedAuth(req, async (userId, agentId) => {
    try {
      const messageId = req.nextUrl.searchParams.get('messageId');
      const conversationId = req.nextUrl.searchParams.get('conversationId');

      if (!messageId || !conversationId) {
        console.warn('GET /api/getMessage: Missing required parameters');
        return NextResponse.json({ 
          error: 'Message ID and Conversation ID are required'
        }, { status: 400 });
      }

      console.log('GET /api/getMessage: Checking for message:', {
        messageId,
        conversationId
      });

      // Find message with conversation constraint
      const message = await db.query.messages.findFirst({
        where: and(
          eq(messages.id, messageId),
          eq(messages.conversationId, conversationId)
        ),
        with: {
          conversation: {
            with: {
              session: {
                with: {
                  agent: true
                }
              }
            }
          }
        }
      });

      // Return empty success if message not found - this is normal for checking existence
      if (!message) {
        console.log('GET /api/getMessage: Message not found');
        return NextResponse.json({ message: null });
      }

      // Verify agent association if provided
      if (agentId && message.conversation?.session?.agent?.id !== agentId) {
        console.warn('GET /api/getMessage: Message does not belong to agent:', {
          messageId,
          agentId
        });
        return NextResponse.json({ error: 'Message not found' }, { status: 403 });
      }

      // Format metadata with defaults
      const defaultMetadata: MessageMetadata = {
        clientId: '',
        deviceInfo: {},
        processingTime: 0,
        completionTokens: 0,
        promptTokens: 0,
        totalTokens: 0,
        toolCalls: [],
        isFinal: false,
        audioDurationSeconds: 0
      };

      const formattedMessage = {
        ...message,
        metadata: {
          ...defaultMetadata,
          ...(message.metadata || {})
        },
        toolCalls: message.toolCalls || [],
        content: {
          text: message.content.text || undefined,
          transcript: message.content.transcript || undefined,
          audioUrl: message.content.audioUrl || undefined
        }
      };

      console.log('GET /api/getMessage: Found message:', {
        id: formattedMessage.id,
        type: formattedMessage.type,
        role: formattedMessage.role
      });

      return NextResponse.json({ message: formattedMessage });

    } catch (error) {
      console.error('GET /api/getMessage: Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch message' },
        { status: 500 }
      );
    }
  });
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-agent-id',
    },
  });
}