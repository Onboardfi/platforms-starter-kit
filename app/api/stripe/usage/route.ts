// app/api/stripe/usage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import db from '@/lib/db';
import { users, usageLogs } from '@/lib/schema';
import { eq, sum } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';

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
          totalAmountDue: 0,
          currentUsage: {
            duration: {
              totalSeconds: 0,
              formattedDuration: '0:00:00'
            },
            tokens: {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
              estimatedCost: 0
            }
          },
          billingPeriodStart: new Date().toISOString(),
          billingPeriodEnd: new Date().toISOString(),
          subscriptionStatus: 'inactive',
        }
      });
    }

    // Get both duration and token usage
    const usage = await db
      .select({
        totalDuration: sum(usageLogs.durationSeconds),
        totalPromptTokens: sum(usageLogs.promptTokens),
        totalCompletionTokens: sum(usageLogs.completionTokens),
        totalTokens: sum(usageLogs.totalTokens),
      })
      .from(usageLogs)
      .where(eq(usageLogs.userId, userId));

    const totalSeconds = Number(usage[0].totalDuration) || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const formattedDuration = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const promptTokens = Number(usage[0].totalPromptTokens) || 0;
    const completionTokens = Number(usage[0].totalCompletionTokens) || 0;
    const totalTokens = Number(usage[0].totalTokens) || 0;

    // Calculate cost based on tokens
    const PRICE_PER_1K_INPUT_TOKENS = 1.5;   // $0.015 per 1K input tokens
    const PRICE_PER_1K_OUTPUT_TOKENS = 2.0;   // $0.020 per 1K output tokens
    
    const inputCost = (promptTokens / 1000) * PRICE_PER_1K_INPUT_TOKENS;
    const outputCost = (completionTokens / 1000) * PRICE_PER_1K_OUTPUT_TOKENS;
    const estimatedCost = Math.round(inputCost + outputCost);

    // Get upcoming invoice
    let totalAmountDue = 0;
    try {
      const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        customer: user.stripeCustomerId,
      });
      totalAmountDue = upcomingInvoice.amount_due;
    } catch (error) {
      console.error('Error fetching upcoming invoice:', error);
    }

    return NextResponse.json({
      success: true,
      usage: {
        totalAmountDue,
        currentUsage: {
          duration: {
            totalSeconds,
            formattedDuration
          },
          tokens: {
            promptTokens,
            completionTokens,
            totalTokens,
            estimatedCost
          }
        },
        rateCard: {
          inputTokens: PRICE_PER_1K_INPUT_TOKENS,
          outputTokens: PRICE_PER_1K_OUTPUT_TOKENS
        },
        billingPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        billingPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        subscriptionStatus: subscription.status,
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