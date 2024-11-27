import { NextRequest, NextResponse } from "next/server";
import { withCombinedAuth } from "@/lib/combined-auth";
import db from "@/lib/db";
import { conversations, onboardingSessions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import type { SelectConversation, SelectOnboardingSession } from "@/lib/schema";

interface ConversationResponse {
  id: string;
  status: string;
  messageCount: number | null;
  startedAt: Date;
  endedAt: Date | null;
  lastMessageAt: Date | null;
  metadata: Record<string, any> | null;
  onboardingSession?: {
    id: string;
    type: string;
    status: string;
    metadata: Record<string, any> | null;
    stepProgress: {
      steps: Array<{
        id: string;
        title: string;
        description: string;
        completed: boolean;
        completedAt?: string;
      }>;
    } | null;
    user?: {
      id: string;
      stripeCustomerId: string | null;
      email: string;
      name: string | null;
    } | null;
    agent?: {
      id: string;
      creator?: {
        id: string;
        stripeCustomerId: string | null;
        email: string;
        name: string | null;
      } | null;
    } | null;
  };
}

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

      // Fetch conversation with related session and user data
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
        with: {
          session: {
            with: {
              user: {
                columns: {
                  id: true,
                  stripeCustomerId: true,
                  email: true,
                  name: true
                }
              },
              agent: {
                with: {
                  creator: {
                    columns: {
                      id: true,
                      stripeCustomerId: true,
                      email: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }

      // If agentId is provided, verify conversation belongs to agent
      if (agentId && conversation.session?.agent?.id !== agentId) {
        return NextResponse.json(
          { error: "Unauthorized access to conversation" },
          { status: 403 }
        );
      }

      // Transform the data for the response
      const response: ConversationResponse = {
        id: conversation.id,
        status: conversation.status,
        messageCount: conversation.messageCount,
        startedAt: conversation.startedAt,
        endedAt: conversation.endedAt,
        lastMessageAt: conversation.lastMessageAt,
        metadata: conversation.metadata,
        onboardingSession: conversation.session ? {
          id: conversation.session.id,
          type: conversation.session.type,
          status: conversation.session.status,
          metadata: conversation.session.metadata,
          stepProgress: conversation.session.stepProgress,
          user: conversation.session.user ? {
            id: conversation.session.user.id,
            stripeCustomerId: conversation.session.user.stripeCustomerId,
            email: conversation.session.user.email,
            name: conversation.session.user.name
          } : null,
          agent: conversation.session.agent ? {
            id: conversation.session.agent.id,
            creator: conversation.session.agent.creator ? {
              id: conversation.session.agent.creator.id,
              stripeCustomerId: conversation.session.agent.creator.stripeCustomerId,
              email: conversation.session.agent.creator.email,
              name: conversation.session.agent.creator.name
            } : null
          } : null
        } : undefined
      };

      return NextResponse.json(response);

    } catch (error) {
      console.error('Error in getConversation:', error);
      return NextResponse.json(
        { error: "Failed to fetch conversation" },
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

export const runtime = 'nodejs';