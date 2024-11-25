import { NextRequest, NextResponse } from "next/server";
import { withCombinedAuth } from "@/lib/combined-auth";
import db from "@/lib/db";
import { usageLogs, onboardingSessions } from "@/lib/schema";
import { createId } from '@paralleldrive/cuid2';
import { eq } from "drizzle-orm";
import { stripe } from '@/lib/stripe';

interface UsageLogRequest {
  messageId: string;
  sessionId: string;
  conversationId: string;
  userId?: string;
  messageRole: 'assistant' | 'user';
  durationSeconds: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  reportingStatus: 'pending' | 'reported';
  stripeCustomerId?: string;
  metadata?: Record<string, any>;
}

// Helper function to report usage to Stripe
async function reportUsageToStripe(
  stripeCustomerId: string, 
  promptTokens: number,
  completionTokens: number
) {
  const timestamp = Math.floor(Date.now() / 1000);

  if (promptTokens > 0) {
    await stripe.billing.meterEvents.create({
      event_name: 'input_tokens',
      identifier: `input_${createId()}`,
      payload: {
        stripe_customer_id: stripeCustomerId,
        value: promptTokens.toString(),
      },
      timestamp
    });
    console.log(`Reported ${promptTokens} input tokens for customer ${stripeCustomerId}`);
  }

  if (completionTokens > 0) {
    await stripe.billing.meterEvents.create({
      event_name: 'output_tokens',
      identifier: `output_${createId()}`,
      payload: {
        stripe_customer_id: stripeCustomerId,
        value: completionTokens.toString(),
      },
      timestamp
    });
    console.log(`Reported ${completionTokens} output tokens for customer ${stripeCustomerId}`);
  }
}

export async function POST(req: NextRequest) {
  return withCombinedAuth(req, async (userId, agentId) => {
    try {
      const data = await req.json() as UsageLogRequest;

      // Get the onboarding session with all necessary relations
      const onboardingSession = await db.query.onboardingSessions.findFirst({
        where: eq(onboardingSessions.id, data.sessionId),
        with: {
          agent: {
            with: {
              creator: true,
              site: {
                with: {
                  organization: true
                }
              }
            }
          },
          user: true
        }
      });

      if (!onboardingSession) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      // Verify session belongs to the authenticated agent
      if (agentId && onboardingSession.agentId !== agentId) {
        return NextResponse.json({ error: "Unauthorized access to session" }, { status: 403 });
      }

      // Get organization ID from the agent's site
      const organizationId = onboardingSession.agent?.site?.organization?.id;
      if (!organizationId) {
        return NextResponse.json({ error: "Organization context not found" }, { status: 400 });
      }

      // Determine effective user and Stripe customer IDs
      const effectiveUserId = onboardingSession.userId || 
                            onboardingSession.agent?.creator?.id ||
                            userId;

      const stripeCustomerId = data.stripeCustomerId || 
                              onboardingSession.user?.stripeCustomerId ||
                              onboardingSession.agent?.creator?.stripeCustomerId;

      // Report usage to Stripe if we have a customer ID
      let stripeReported = false;
      if (stripeCustomerId) {
        try {
          await reportUsageToStripe(
            stripeCustomerId,
            data.promptTokens,
            data.completionTokens
          );
          stripeReported = true;
          console.log('Successfully reported usage to Stripe meters');
        } catch (error) {
          console.error('Failed to report usage to Stripe:', error);
        }
      } else {
        console.log('No Stripe customer ID available for usage reporting');
      }

      // Create the base usage log record
      const logData = {
        userId: effectiveUserId,
        sessionId: data.sessionId,
        conversationId: data.conversationId,
        messageId: data.messageId,
        messageRole: data.messageRole,
        durationSeconds: data.durationSeconds,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        totalTokens: data.totalTokens,
        stripeCustomerId: stripeCustomerId || null,
        reportingStatus: stripeReported ? 'reported' as const : 'pending' as const,
        createdAt: new Date(),
        organizationId // Add organization context
      };

      // Insert the primary usage log
      const [result] = await db.insert(usageLogs)
        .values({
          id: createId(),
          ...logData
        })
        .returning();

      // If there's a different agent creator than session user, create a second log entry
      if (onboardingSession.userId && 
          onboardingSession.agent?.creator?.id &&
          onboardingSession.userId !== onboardingSession.agent.creator.id) {
        
        // If agent creator has their own Stripe customer ID, report their usage separately
        const agentCreatorStripeId = onboardingSession.agent.creator.stripeCustomerId;
        if (agentCreatorStripeId) {
          try {
            await reportUsageToStripe(
              agentCreatorStripeId,
              data.promptTokens,
              data.completionTokens
            );
            console.log('Successfully reported agent creator usage to Stripe meters');
          } catch (error) {
            console.error('Failed to report agent creator usage to Stripe:', error);
          }
        }

        await db.insert(usageLogs)
          .values({
            id: createId(),
            ...logData,
            userId: onboardingSession.agent.creator.id,
            stripeCustomerId: agentCreatorStripeId || null
          });
      }

      return NextResponse.json({ 
        success: true, 
        id: result.id,
        effectiveUserId,
        stripeCustomerId,
        stripeReported,
        organizationId
      });

    } catch (error) {
      console.error('Error logging usage:', error, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return NextResponse.json(
        { error: "Failed to log usage" }, 
        { status: 500 }
      );
    }
  });
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-agent-id, x-user-id',
    },
  });
}

export const runtime = 'nodejs';