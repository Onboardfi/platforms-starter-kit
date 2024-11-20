// app/api/getConversation/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withCombinedAuth } from "@/lib/combined-auth";
import db from "@/lib/db";
import { conversations, onboardingSessions } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

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
                  user: {
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
      if (agentId) {
        const isValidAgent = conversation.session?.agent?.id === agentId;
        if (!isValidAgent) {
          return NextResponse.json(
            { error: "Unauthorized access to conversation" },
            { status: 403 }
          );
        }
      }

      // Prepare response by transforming the data
      const response = {
        id: conversation.id,
        status: conversation.status,
        messageCount: conversation.messageCount,
        startedAt: conversation.startedAt,
        endedAt: conversation.endedAt,
        lastMessageAt: conversation.lastMessageAt,
        metadata: conversation.metadata,
        session: conversation.session ? {
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
            user: conversation.session.agent.user ? {
              id: conversation.session.agent.user.id,
              stripeCustomerId: conversation.session.agent.user.stripeCustomerId,
              email: conversation.session.agent.user.email,
              name: conversation.session.agent.user.name
            } : null
          } : null
        } : null
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