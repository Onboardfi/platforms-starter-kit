import { NextRequest, NextResponse } from 'next/server';
import { withCombinedAuth } from '@/lib/combined-auth';
import { addMessage } from '@/lib/upstash';
import { createId } from '@paralleldrive/cuid2';
import { and, eq, sql } from 'drizzle-orm';
import db from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { users, conversations, usageLogs } from '@/lib/schema';
import {
  MessageType,
  MessageRole,
  MessageContent,
  MessageMetadata,
  SelectMessage,
  ConversationStatus  // Add this import
} from '@/lib/types';

interface WebSocketMessageContent {
  type?: string;
  text?: string;
  transcript?: string;
  audioUrl?: string;
}
// At the top of the file, add this interface
interface ConversationWithSession {
  id: string;
  sessionId: string;
  status: ConversationStatus;
  metadata: Record<string, any>;
  session?: {
    id: string;
    organizationId: string;
    userId?: string | null;
    agent?: {
      id: string;
      userId: string | null;
      creator?: {
        id: string;
        name: string | null;
        email: string;
      } | null;
    } | null;
  } | null;
  startedAt: Date;
  endedAt: Date | null;
  lastMessageAt: Date | null;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}
/**
 * Convert WebSocket message content to expected format
 */
function normalizeMessageContent(content: WebSocketMessageContent[] | WebSocketMessageContent): MessageContent {
  // Handle array-style content from WebSocket
  if (Array.isArray(content)) {
    const firstContent = content[0] || {};
    return {
      text: firstContent.text || undefined,
      transcript: firstContent.transcript || undefined,
      audioUrl: firstContent.audioUrl || undefined
    };
  }
  
  // Handle direct object format
  return {
    text: content.text || undefined,
    transcript: content.transcript || undefined,
    audioUrl: content.audioUrl || undefined
  };
}

export async function POST(req: NextRequest) {
  return withCombinedAuth(req, async (userId, agentId, authState) => {
    try {
      // Allow anonymous users if they have a valid auth state
      const effectiveUserId = userId || (authState?.isAnonymous ? 'anonymous' : undefined);
      
      if (!effectiveUserId) {
        console.error('POST /api/saveMessage: Missing userId and not anonymous');
        return NextResponse.json(
          { error: 'Unauthorized - User ID required' },
          { status: 401 }
        );
      }

      const { message } = await req.json();

      console.log('POST /api/saveMessage: Processing request:', {
        messageId: message.id,
        conversationId: message.conversationId,
        type: message.type,
        role: message.role,
        effectiveUserId
      });

      if (!message.conversationId) {
        console.warn('POST /api/saveMessage: Missing conversationId');
        return NextResponse.json(
          { error: 'Conversation ID required' },
          { status: 400 }
        );
      }const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, message.conversationId),
        with: {
          session: {
            columns: {
              id: true,
              organizationId: true,
              userId: true
            },
            with: {
              agent: {
                columns: {
                  id: true,
                  createdBy: true  // Changed from userId to createdBy
                },
                with: {
                  creator: {
                    columns: {
                      id: true,
                      name: true,
                      email: true
                    }
                  }
                }
              }
            }
          }
        }
      }) as ConversationWithSession;
      if (!conversation) {
        console.warn(`POST /api/saveMessage: Conversation not found: ${message.conversationId}`);
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }

      // Use conversation session user ID if available, otherwise use effective user ID
      const dbUserId = conversation.session?.userId || effectiveUserId;

      // Normalize the message content to expected format
      const normalizedContent = normalizeMessageContent(message.content);
      
      try {
        console.log('POST /api/saveMessage: Attempting to save message with data:', {
          id: message.id,
          conversationId: message.conversationId,
          content: normalizedContent,
          effectiveUserId: dbUserId
        });

        const savedMessage = await addMessage({
          id: message.id || createId(),
          conversationId: message.conversationId,
          type: message.type || (normalizedContent.transcript ? 'transcript' : 'text'),
          role: message.role,
          content: normalizedContent,
          metadata: {
            ...message.metadata || {},
            effectiveUserId: dbUserId // Add user ID to metadata for tracking
          },
          parentMessageId: message.parentMessageId,
          stepId: message.stepId
        });

        // Handle usage tracking for assistant audio messages
        if (message.role === 'assistant' && message.metadata?.audioDurationSeconds) {
          try {
            // Only attempt Stripe tracking for non-anonymous users
            if (dbUserId !== 'anonymous') {
              const user = await db.query.users.findFirst({
                where: eq(users.id, dbUserId),
              });

              if (user?.stripeCustomerId) {
                await stripe.billing.meterEvents.create({
                  event_name: 'api_requests',
                  payload: {
                    stripe_customer_id: user.stripeCustomerId,
                    value: Math.round(message.metadata.audioDurationSeconds).toString()
                  }
                });

                console.log('POST /api/saveMessage: Stripe meter event sent:', {
                  userId: dbUserId,
                  duration: message.metadata.audioDurationSeconds
                });
              }
            }

            await db.insert(usageLogs).values({
              id: createId(),
              userId: dbUserId,
              sessionId: conversation.sessionId,
              conversationId: conversation.id,
              messageId: savedMessage.id,
              durationSeconds: Math.round(message.metadata.audioDurationSeconds),
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
              messageRole: message.role,
              stripeCustomerId: null,
              reportingStatus: 'pending',
              organizationId: conversation.session?.organizationId ?? '' // Add organization ID
            });
          } catch (error) {
            console.error('POST /api/saveMessage: Error tracking usage:', error);
            // Continue despite usage tracking error
          }
        }

        console.log('POST /api/saveMessage: Successfully saved message:', {
          messageId: savedMessage.id,
          conversationId: savedMessage.conversationId
        });

        return NextResponse.json({
          success: true,
          message: savedMessage
        });

      } catch (error) {
        console.error('POST /api/saveMessage: Error saving message:', error);
        throw error;
      }
    } catch (error) {
      console.error('POST /api/saveMessage: Unhandled error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

export async function GET(req: NextRequest) {
  return withCombinedAuth(req, async (userId, agentId, authState) => {
    try {
      const effectiveUserId = userId || (authState?.isAnonymous ? 'anonymous' : undefined);
      
      if (!effectiveUserId) {
        console.error('GET /api/saveMessage: Missing userId and not anonymous');
        return NextResponse.json(
          { error: 'Unauthorized - User ID required' },
          { status: 401 }
        );
      }

      const sessionId = req.nextUrl.searchParams.get('sessionId');
      const whereClause = sessionId
        ? and(eq(usageLogs.userId, effectiveUserId), eq(usageLogs.sessionId, sessionId))
        : eq(usageLogs.userId, effectiveUserId);

      console.log('GET /api/saveMessage: Fetching usage stats:', {
        userId: effectiveUserId,
        sessionId: sessionId || 'all'
      });

      const usageStats = await db
        .select({
          totalMessages: sql<number>`CAST(COUNT(${usageLogs.id}) AS INTEGER)`,
          totalDuration: sql<number>`COALESCE(SUM(${usageLogs.durationSeconds}), 0)::INTEGER`
        })
        .from(usageLogs)
        .where(whereClause);

      const stats = usageStats[0];
      
      const response = {
        totalDurationSeconds: stats.totalDuration || 0,
        messageCount: stats.totalMessages || 0,
        sessionId: sessionId || null,
        userId: effectiveUserId
      };

      console.log('GET /api/saveMessage: Retrieved usage stats:', response);
      return NextResponse.json(response);

    } catch (error) {
      console.error('GET /api/saveMessage: Error fetching usage stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch usage statistics' },
        { status: 500 }
      );
    }
  });
}