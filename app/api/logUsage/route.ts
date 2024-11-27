///Users/bobbygilbert/Documents/Github/platforms-starter-kit/app/api/logUsage/route.ts


import { NextRequest, NextResponse } from "next/server";
import { withCombinedAuth } from "@/lib/combined-auth";
import db from "@/lib/db";
import { usageLogs, onboardingSessions, organizations } from '@/lib/schema';
import { createId } from '@paralleldrive/cuid2';
import { eq } from "drizzle-orm";
import { stripe } from '@/lib/stripe';
import { Stripe } from 'stripe';

interface V2MeterEvent {
  object: 'v2.billing.meter_event';
  created: string;
  livemode: boolean;
  identifier: string;
  event_name: string;
  timestamp: string;
  payload: {
    stripe_customer_id: string;
    value: string;
    metadata?: string;
  };
}

type MeterEventResponse = {
  success: boolean;
  id?: string;
  error?: any;
  type: 'input' | 'output';
};

async function verifyStripeMeters() {
  try {
    console.log('Checking active Stripe meters...');
    const meters = await stripe.billing.meters.list({ status: 'active' });
    const inputMeter = meters.data.find(m => m.event_name === 'input_tokens');
    const outputMeter = meters.data.find(m => m.event_name === 'output_tokens');
    
    console.log('Active meters:', { 
      inputMeter: inputMeter ? {
        id: inputMeter.id,
        status: inputMeter.status,
        event_name: inputMeter.event_name
      } : null,
      outputMeter: outputMeter ? {
        id: outputMeter.id,
        status: outputMeter.status,
        event_name: outputMeter.event_name
      } : null
    });

    if (!inputMeter || !outputMeter) {
      throw new Error('Required meters not found');
    }

    return { inputMeter, outputMeter };
  } catch (error) {
    console.error('Error verifying Stripe meters:', error);
    throw error;
  }
}
async function reportUsageToStripe(
  stripeCustomerId: string, 
  promptTokens: number,
  completionTokens: number,
  organizationId: string
): Promise<MeterEventResponse[]> {
  const timestamp = new Date().toISOString();
  const identifier = createId();
  const reportPromises: Promise<MeterEventResponse>[] = [];

  // First verify meters exist and are active
  await verifyStripeMeters();

  if (promptTokens > 0) {
    reportPromises.push(
      stripe.v2.billing.meterEvents.create({
        event_name: 'input_tokens',
        identifier: `input_${identifier}`,
        timestamp,
        payload: {
          stripe_customer_id: stripeCustomerId,
          value: promptTokens.toString(),
          metadata: JSON.stringify({
            organizationId,
            type: 'input'
          })
        }
      }).then((response: any) => ({
        success: true,
        id: response.identifier,
        type: 'input' as const
      })).catch(error => ({
        success: false,
        error,
        type: 'input' as const
      }))
    );
  }

  if (completionTokens > 0) {
    reportPromises.push(
      stripe.v2.billing.meterEvents.create({
        event_name: 'output_tokens',
        identifier: `output_${identifier}`,
        timestamp,
        payload: {
          stripe_customer_id: stripeCustomerId,
          value: completionTokens.toString(),
          metadata: JSON.stringify({
            organizationId,
            type: 'output'
          })
        }
      }).then((response: any) => ({
        success: true,
        id: response.identifier,
        type: 'output' as const
      })).catch(error => ({
        success: false,
        error,
        type: 'output' as const
      }))
    );
  }

  return Promise.all(reportPromises);
}
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

      if (!onboardingSession?.organizationId) {
        console.error('Missing organization context:', { 
          sessionId: reqData.sessionId,
          session: onboardingSession 
        });
        throw new Error('Organization context not found');
      }

      const organizationId = onboardingSession.organizationId;
      const organization = await db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId)
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Handle user ID for anonymous users
      const effectiveUserId = userId?.startsWith('user-') ? null : userId;

      // Create initial usage log record
      const [logResult] = await db.insert(usageLogs)
        .values({
          id: createId(),
          userId: effectiveUserId,
          organizationId,
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

      // Handle Stripe usage reporting if customer exists
      if (organization.stripeCustomerId) {
        try {
          const stripeResults = await reportUsageToStripe(
            organization.stripeCustomerId,
            reqData.promptTokens || 0,
            reqData.completionTokens || 0,
            organizationId
          );

          // Process results and update usage log with event IDs
          for (const result of stripeResults) {
            if (result.success && result.id) {
              await db.update(usageLogs)
                .set({ 
                  stripeEventId: result.id,
                  reportingStatus: 'reported'
                })
                .where(eq(usageLogs.id, logResult.id));

              console.log('Updated usage log with Stripe event:', {
                logId: logResult.id,
                eventId: result.id,
                type: result.type,
                status: 'reported'
              });
            } else {
              console.error('Failed to report usage to Stripe:', {
                error: result.error,
                type: result.type,
                logId: logResult.id
              });
            }
          }
        } catch (stripeError) {
          console.error('Failed to report usage to Stripe:', {
            error: stripeError,
            logId: logResult.id,
            organizationId,
            customerId: organization.stripeCustomerId
          });
          // Continue execution - don't fail the whole request
        }
      }

      console.log('Successfully logged usage:', {
        id: logResult.id,
        sessionId: reqData.sessionId,
        organizationId,
        effectiveUserId,
        hasStripeCustomer: !!organization.stripeCustomerId,
        tokens: {
          prompt: reqData.promptTokens,
          completion: reqData.completionTokens,
          total: reqData.totalTokens
        }
      });

      return NextResponse.json({ 
        success: true,
        id: logResult.id
      });

    } catch (error) {
      console.error('Error logging usage:', error);
      return NextResponse.json(
        { 
          error: "Failed to log usage",
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      );
    }
  });
}

export const runtime = 'nodejs';