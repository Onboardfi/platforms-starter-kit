import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import db from '@/lib/db';
import { users, usageLogs } from '@/lib/schema';
import { eq, sum } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';

// Constants for pricing
const PRICE_PER_1K_INPUT_TOKENS = 1.5;   // $0.015 per 1K input tokens
const PRICE_PER_1K_OUTPUT_TOKENS = 2.0;   // $0.020 per 1K output tokens

// Helper function to align timestamp to start of day (UTC)
function alignToStartOfDay(timestamp: number) {
  const date = new Date(timestamp * 1000);
  date.setUTCHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

// Helper function to align timestamp to end of day (UTC)
function alignToEndOfDay(timestamp: number) {
  const date = new Date(timestamp * 1000);
  date.setUTCHours(23, 59, 59, 999);
  return Math.floor(date.getTime() / 1000);
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = token.sub;
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 });
    }

    // Get subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    const subscription = subscriptions.data[0];
    if (!subscription) {
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
      });
    }

    // Get meters for input and output tokens
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
          customer: user.stripeCustomerId,
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
          customer: user.stripeCustomerId,
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

    // Get backup usage from database if meter events are not yet available
    const dbUsage = await db
      .select({
        totalPromptTokens: sum(usageLogs.promptTokens),
        totalCompletionTokens: sum(usageLogs.completionTokens),
        totalTokens: sum(usageLogs.totalTokens),
      })
      .from(usageLogs)
      .where(eq(usageLogs.userId, userId));

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
        customer: user.stripeCustomerId,
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
    });
  } catch (error) {
    console.error('Error fetching Stripe usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing data' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';