import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import db from '@/lib/db';
import { users, usageLogs, onboardingSessions, organizations, organizationMemberships } from '@/lib/schema';
import { eq, sum, and } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';
import { createId } from '@paralleldrive/cuid2';

const PRICE_PER_1K_INPUT_TOKENS = 1.5;   // $0.015 per 1K input tokens
const PRICE_PER_1K_OUTPUT_TOKENS = 2.0;   // $0.020 per 1K output tokens

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-agent-id',
};

// Helper function to align timestamp to start of day (UTC)
function alignToStartOfDay(timestamp: number) {
  const date = new Date(timestamp * 1000);
  date.setUTCHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

// Helper function to align timestamp to end of day (UTC)
function alignToEndOfDay(timestamp: number) {
  const date = new Date(timestamp * 1000);
  date.setUTCHours(23, 59, 59, 0); // Changed from 999ms to 0ms
  return Math.floor(date.getTime() / 1000) + 1; // Add 1 second to align with daily boundary
}






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
      } as any).then((response: unknown) => {
        const event = response as V2MeterEvent;
        return {
          success: true,
          id: event.identifier,
          type: 'input' as const
        };
      }).catch(error => ({
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
      } as any).then((response: unknown) => {
        const event = response as V2MeterEvent;
        return {
          success: true,
          id: event.identifier,
          type: 'output' as const
        };
      }).catch(error => ({
        success: false,
        error,
        type: 'output' as const
      }))
    );
  }

  return Promise.all(reportPromises);
}

async function getOrganizationContext(token: any) {
  let organizationId: string | null = null;
  let stripeCustomerId: string | null = null;
  let effectiveUserId = 'anonymous';

  if (token?.sub) {
    effectiveUserId = token.sub;
    
    // First try to get organization context from token
    if (token.organizationId) {
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, token.organizationId)
      });
      if (org?.stripeCustomerId) {
        stripeCustomerId = org.stripeCustomerId;
        organizationId = org.id;
        console.log('Found organization from token:', {
          organizationId,
          hasStripeCustomer: true
        });
      }
    }
    
    // If no org context in token, try to get from user's membership
    if (!stripeCustomerId) {
      const membership = await db.query.organizationMemberships.findFirst({
        where: eq(organizationMemberships.userId, token.sub),
        with: {
          organization: true
        }
      });
      
      if (membership?.organization?.stripeCustomerId) {
        stripeCustomerId = membership.organization.stripeCustomerId;
        organizationId = membership.organizationId;
        console.log('Found organization from membership:', {
          organizationId,
          hasStripeCustomer: true
        });
      }
    }
  }

  return { organizationId, stripeCustomerId, effectiveUserId };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    // First try to get auth token
    const token = await getToken({ req });
    const { organizationId, stripeCustomerId, effectiveUserId } = await getOrganizationContext(token);
    
    console.log('Initial auth state:', { 
      hasToken: !!token, 
      userId: token?.sub,
      organizationId,
      hasStripeCustomer: !!stripeCustomerId
    });

    // Return empty usage data if no Stripe customer found
    if (!stripeCustomerId) {
      console.log('No Stripe customer ID found, returning empty usage data');
      return NextResponse.json({
        success: true,
        usage: {
          input_tokens: { total: 0, summaries: [], ratePerThousand: PRICE_PER_1K_INPUT_TOKENS },
          output_tokens: { total: 0, summaries: [], ratePerThousand: PRICE_PER_1K_OUTPUT_TOKENS },
          subscription: {
            status: 'inactive',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date().toISOString()
          },
          invoice: {
            amount_due: 0,
            estimated_total: 0
          }
        }
      }, { headers: corsHeaders });
    }

    // Get subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    const subscription = subscriptions.data[0];
    if (!subscription) {
      console.log('No active subscription found');
      return NextResponse.json({
        success: true,
        usage: {
          input_tokens: { total: 0, summaries: [], ratePerThousand: PRICE_PER_1K_INPUT_TOKENS },
          output_tokens: { total: 0, summaries: [], ratePerThousand: PRICE_PER_1K_OUTPUT_TOKENS },
          subscription: {
            status: 'inactive',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date().toISOString()
          },
          invoice: {
            amount_due: 0,
            estimated_total: 0
          }
        }
      }, { headers: corsHeaders });
    }

    // Get meters for input and output tokens
    console.log('Fetching Stripe meters...');
    const meters = await stripe.billing.meters.list({ status: 'active' });
    const inputTokenMeter = meters.data.find(m => m.event_name === 'input_tokens');
    const outputTokenMeter = meters.data.find(m => m.event_name === 'output_tokens');

    // Align timestamps with daily boundaries
    const periodStart = alignToStartOfDay(subscription.current_period_start);
    const periodEnd = alignToEndOfDay(subscription.current_period_end);

    console.log('Fetching meter summaries with aligned timestamps:', {
      periodStart: new Date(periodStart * 1000).toISOString(),
      periodEnd: new Date(periodEnd * 1000).toISOString()
    });

    // Fetch meter summaries for the current billing period
    const [inputSummaries, outputSummaries] = await Promise.all([
      inputTokenMeter ? stripe.billing.meters.listEventSummaries(
        inputTokenMeter.id,
        {
          customer: stripeCustomerId,
          start_time: periodStart,
          end_time: periodEnd,
          value_grouping_window: 'day'
        }
      ).catch(error => {
        console.error('Error fetching input token summaries:', error);
        return null;
      }) : null,
      outputTokenMeter ? stripe.billing.meters.listEventSummaries(
        outputTokenMeter.id,
        {
          customer: stripeCustomerId,
          start_time: periodStart,
          end_time: periodEnd,
          value_grouping_window: 'day'
        }
      ).catch(error => {
        console.error('Error fetching output token summaries:', error);
        return null;
      }) : null
    ]);

    // Calculate totals from meter events
    const totalInputTokens = inputSummaries?.data.reduce(
      (sum, summary) => sum + summary.aggregated_value, 
      0
    ) || 0;

    const totalOutputTokens = outputSummaries?.data.reduce(
      (sum, summary) => sum + summary.aggregated_value, 
      0
    ) || 0;

    // Get backup usage from database
    const dbUsage = await db
      .select({
        totalPromptTokens: sum(usageLogs.promptTokens),
        totalCompletionTokens: sum(usageLogs.completionTokens),
        totalTokens: sum(usageLogs.totalTokens),
      })
      .from(usageLogs)
      .where(eq(usageLogs.organizationId, organizationId as string));

    // Use the larger value between meter events and database records
    const finalInputTokens = Math.max(totalInputTokens, Number(dbUsage[0].totalPromptTokens) || 0);
    const finalOutputTokens = Math.max(totalOutputTokens, Number(dbUsage[0].totalCompletionTokens) || 0);

    // Calculate estimated cost
    const inputCost = (finalInputTokens / 1000) * PRICE_PER_1K_INPUT_TOKENS;
    const outputCost = (finalOutputTokens / 1000) * PRICE_PER_1K_OUTPUT_TOKENS;
    const estimatedCost = Math.round(inputCost + outputCost);

    // Get upcoming invoice
    let upcomingInvoice;
    try {
      upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        customer: stripeCustomerId,
      });
    } catch (error) {
      console.error('Error fetching upcoming invoice:', error);
    }

    return NextResponse.json({
      success: true,
      usage: {
        input_tokens: {
          total: finalInputTokens,
          summaries: inputSummaries?.data || [],
          ratePerThousand: PRICE_PER_1K_INPUT_TOKENS
        },
        output_tokens: {
          total: finalOutputTokens,
          summaries: outputSummaries?.data || [],
          ratePerThousand: PRICE_PER_1K_OUTPUT_TOKENS
        },
        subscription: {
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
        },
        invoice: {
          amount_due: upcomingInvoice?.amount_due || 0,
          estimated_total: estimatedCost
        }
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error fetching Stripe usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing data' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const reqData = await req.json();
    const { organizationId, stripeCustomerId } = await getOrganizationContext(token);

    if (!organizationId) {
      throw new Error('Organization context not found');
    }

    if (!stripeCustomerId) {
      return NextResponse.json({ 
        success: false, 
        error: 'No Stripe customer found for organization' 
      }, { headers: corsHeaders });
    }

    const result = await reportUsageToStripe(
      stripeCustomerId,
      reqData.promptTokens || 0,
      reqData.completionTokens || 0,
      organizationId
    );

    return NextResponse.json({ 
      success: true,
      results: result
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error reporting usage:', error);
    return NextResponse.json(
      { 
        error: 'Failed to report usage',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500, headers: corsHeaders }
    );
  }
}