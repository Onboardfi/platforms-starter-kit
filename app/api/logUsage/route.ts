import { NextRequest, NextResponse } from "next/server";
import { withCombinedAuth } from "@/lib/combined-auth";
import db from "@/lib/db";
import { usageLogs, onboardingSessions, organizations } from '@/lib/schema';
import { createId } from '@paralleldrive/cuid2';
import { eq } from "drizzle-orm";
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  return withCombinedAuth(req, async (userId, agentId) => {
    try {
      const reqData = await req.json();

      // Get organization context with all necessary relations
      const onboardingSession = await db.query.onboardingSessions.findFirst({
        where: eq(onboardingSessions.id, reqData.sessionId),
        with: {
          agent: {
            with: {
              site: {
                with: {
                  organization: true
                }
              }
            }
          }
        }
      });

      // Double check organization context exists
      if (!onboardingSession?.organizationId) {
        console.error('Missing organization context:', { 
          sessionId: reqData.sessionId,
          session: onboardingSession 
        });
        throw new Error('Organization context not found');
      }

      // Get organization context directly from session
      const organizationId = onboardingSession.organizationId;

      // Get the organization to check Stripe details
      const organization = await db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId)
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Handle user ID for anonymous users
      const effectiveUserId = userId?.startsWith('user-') ? null : userId;

      // Create the usage log record with organization ID from session
      const [result] = await db.insert(usageLogs)
        .values({
          id: createId(),
          userId: effectiveUserId,
          organizationId, // Use organization ID directly from session
          sessionId: reqData.sessionId,
          messageId: reqData.messageId,
          messageRole: reqData.messageRole,
          durationSeconds: reqData.durationSeconds || 0,
          promptTokens: reqData.promptTokens || 0,
          completionTokens: reqData.completionTokens || 0,
          totalTokens: reqData.totalTokens || 0,
          stripeCustomerId: organization.stripeCustomerId || null,
          reportingStatus: 'pending',
          createdAt: new Date()
        })
        .returning();

      // Report usage to Stripe if organization has Stripe set up
      if (organization.stripeCustomerId) {
        await reportUsageToStripe(
          organization.stripeCustomerId,
          reqData.promptTokens || 0,
          reqData.completionTokens || 0,
          organizationId
        ).catch(error => {
          console.error('Failed to report usage to Stripe:', error);
        });
      }

      console.log('Successfully logged usage:', {
        id: result.id,
        sessionId: reqData.sessionId,
        organizationId,
        effectiveUserId,
        hasStripeCustomer: !!organization.stripeCustomerId
      });

      return NextResponse.json({ 
        success: true,
        id: result.id
      });

    } catch (error) {
      console.error('Error logging usage:', error);
      return NextResponse.json(
        { 
          error: "Failed to log usage",
          details: error instanceof Error ? error.message : String(error),
          context: {
            sessionId: reqData?.sessionId,
            userId,
            messageId: reqData?.messageId
          }
        },

        { status: 500 }
      );
    }
  });
}

async function reportUsageToStripe(
  stripeCustomerId: string, 
  promptTokens: number,
  completionTokens: number,
  organizationId: string
) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const identifier = createId();

  const reportPromises = [];

  if (promptTokens > 0) {
    reportPromises.push(
      stripe.billing.meterEvents.create({
        event_name: 'input_tokens',
        identifier: `input_${identifier}`,
        payload: {
          stripe_customer_id: stripeCustomerId,
          value: promptTokens.toString(),
          timestamp,
          metadata: JSON.stringify({
            organizationId,
            type: 'input'
          })
        }
      }).catch(error => {
        console.error('Failed to report input tokens to Stripe:', error);
      })
    );
  }

  if (completionTokens > 0) {
    reportPromises.push(
      stripe.billing.meterEvents.create({
        event_name: 'output_tokens',
        identifier: `output_${identifier}`,
        payload: {
          stripe_customer_id: stripeCustomerId,
          value: completionTokens.toString(),
          timestamp,
          metadata: JSON.stringify({
            organizationId,
            type: 'output'
          })
        }
      }).catch(error => {
        console.error('Failed to report output tokens to Stripe:', error);
      })
    );
  }

  try {
    const results = await Promise.allSettled(reportPromises);
    
    // Log results for debugging
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`Successfully reported meter event ${index + 1}:`, result.value);
      } else {
        console.error(`Failed to report meter event ${index + 1}:`, result.reason);
      }
    });

    return results;
  } catch (error) {
    console.error('Error reporting usage to Stripe:', error);
    throw error;
  }
}

export const runtime = 'nodejs';