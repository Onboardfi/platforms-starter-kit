// app/api/saveMessage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withCombinedAuth } from '@/lib/combined-auth';
import { addMessage } from '@/lib/upstash'; // Ensure correct import path
import { and, eq, sql } from 'drizzle-orm';
import db from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { users, conversations, usageLogs } from '@/lib/schema'; // Add 'users' to imports
import { MessageType, MessageRole, MessageContent, MessageMetadata } from '@/lib/types';

export async function POST(req: NextRequest) {
  return withCombinedAuth(req, async (userId, agentId) => {
    try {
      // Add type guard for userId
      if (!userId) {
        throw new Error('User ID is required');
      }

      const body = await req.json();
      const { conversationId, message } = body;

      if (!conversationId) {
        return NextResponse.json(
          { error: 'Conversation ID required' },
          { status: 400 }
        );
      }

      // Verify conversation and get session info
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
        with: {
          session: true,
        },
      });

      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }

      // Save message
      try {
        const savedMessage = await addMessage(
          conversationId,
          message.content.transcript
            ? ('transcript' as MessageType)
            : ('text' as MessageType),
          message.role as MessageRole,
          {
            text: message.content.text,
            transcript: message.content.transcript,
            audioUrl: message.content.audioUrl,
          } as MessageContent,
          message.metadata as MessageMetadata,
          message.parentMessageId,
          message.stepId
        );

        // After saving the message, send the meter event to Stripe
        if (message.role === 'assistant' && message.metadata?.audioDurationSeconds) {
          try {
            const user = await db.query.users.findFirst({
              where: eq(users.id, userId),
            });

            if (user?.stripeCustomerId) {
              await stripe.billing.meterEvents.create({
                event_name: 'api_requests',
                payload: {
                  stripe_customer_id: user.stripeCustomerId,
                  value: message.metadata.audioDurationSeconds.toString(), // Convert to string
                },
              });

              console.log(`Sent meter event to Stripe for user ${userId}`);
            }
          } catch (error) {
            console.error('Failed to send meter event to Stripe:', error);
          }
        }

        return NextResponse.json({
          success: true,
          message: savedMessage,
        });
      } catch (error) {
        console.error('Failed to save message:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in saveMessage handler:', error);
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      );
    }
  });
}

export async function GET(req: NextRequest) {
  return withCombinedAuth(req, async (userId, agentId) => {
    try {
      // Add type guard for userId
      if (!userId) {
        throw new Error('User ID is required');
      }

      const sessionId = req.nextUrl.searchParams.get('sessionId');

      let whereClause;

      if (sessionId) {
        whereClause = and(
          eq(usageLogs.userId, userId),
          eq(usageLogs.sessionId, sessionId)
        );
      } else {
        whereClause = eq(usageLogs.userId, userId);
      }

      const query = db
        .select({
          totalDuration: sql<number>`COALESCE(SUM(${usageLogs.durationSeconds}), 0)::int`,
          messageCount: sql<number>`COALESCE(COUNT(*), 0)::int`,
        })
        .from(usageLogs)
        .where(whereClause);

      const results = await query;
      const usage = results[0];

      if (!usage) {
        return NextResponse.json({
          totalDurationSeconds: 0,
          messageCount: 0,
        });
      }

      return NextResponse.json({
        totalDurationSeconds: usage.totalDuration,
        messageCount: usage.messageCount,
        sessionId: sessionId || null,
        userId,
      });
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch usage stats' },
        { status: 500 }
      );
    }
  });
}
