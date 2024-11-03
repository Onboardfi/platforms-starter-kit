// app/api/createSession/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createOnboardingSession, getAgentById } from "@/lib/actions";
import { withCombinedAuth, type AuthState } from "@/lib/combined-auth";
import db from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    // 1. Extract the agent ID from both headers and body
    const body = await req.json();
    const agentId = req.headers.get('x-agent-id') || body.agentId;

    if (!agentId) {
      console.warn('Agent ID missing in both headers and body');
      return NextResponse.json(
        { error: "Agent ID required", success: false }, 
        { status: 400 }
      );
    }

    // 2. Get agent to check settings
    const agent = await getAgentById(agentId);
    if (!agent) {
      console.warn(`Agent not found: ${agentId}`);
      return NextResponse.json(
        { error: "Agent not found", success: false }, 
        { status: 404 }
      );
    }

    // 3. Check if authentication is required for this agent
    const isInternalOnboarding = agent.settings.onboardingType === 'internal';
    const isAuthEnabled = agent.settings.authentication?.enabled;

    return withCombinedAuth(req, async (userId: string | undefined, _, authState?: AuthState) => {
      try {
        const { 
          name = 'New Session',
          type = 'internal',
          clientIdentifier 
        } = body;

        // 4. Validate authentication for internal onboarding
        if (isInternalOnboarding && isAuthEnabled && !authState?.isAuthenticated) {
          return NextResponse.json({
            error: "Authentication required for internal onboarding",
            success: false,
            requiresAuth: true,
            agentId: agent.id,
            agentName: agent.name,
            authMessage: agent.settings.authentication?.message
          }, { status: 401 });
        }

        // 5. Check if user exists in database before using ID
        let effectiveUserId = undefined;
        if (userId && authState?.isAuthenticated) {
          const userExists = await db.query.users.findFirst({
            where: eq(users.id, userId)
          });
          if (userExists) {
            effectiveUserId = userId;
          }
        }

        // 6. Create the session
        const sessionId = await createOnboardingSession(agentId, {
          name,
          type,
          userId: effectiveUserId,
          authState: {
            isAuthenticated: authState?.isAuthenticated || false,
            isAnonymous: authState?.isAnonymous || !effectiveUserId
          },
          clientIdentifier: clientIdentifier || `${effectiveUserId || 'anon'}-${Date.now()}`
        });

        console.log('Session created successfully:', {
          sessionId,
          agentId,
          type,
          effectiveUserId,
          authState
        });

        return NextResponse.json({ 
          sessionId,
          success: true 
        });

      } catch (error) {
        console.error('Failed to create session:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          agentId,
          userId,
          authState,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });

        if (error instanceof Error) {
          // Handle specific error cases
          if (error.message === 'Authentication required for internal onboarding') {
            return NextResponse.json({
              error: error.message,
              success: false,
              requiresAuth: true,
              agentId: agent.id,
              agentName: agent.name,
              authMessage: agent.settings.authentication?.message
            }, { status: 401 });
          }

          if (error.message.includes('violates foreign key constraint')) {
            return NextResponse.json({
              error: 'Failed to create session: invalid user ID',
              success: false
            }, { status: 400 });
          }
        }

        // Generic error response
        return NextResponse.json({
          error: 'Failed to create session: internal server error',
          success: false
        }, { status: 500 });
      }
    });
  } catch (error) {
    console.error('Create session route error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      success: false
    }, { status: 500 });
  }
}