import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
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
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
    }

    // Get upcoming invoice
    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      customer: user.stripeCustomerId,
    });

    // Get current billing period
    const currentPeriodStart = new Date(subscription.current_period_start * 1000);
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

    // Get price per minute
    const price = await stripe.prices.retrieve(subscription.items.data[0].price.id);
    const ratePerMinute = price.unit_amount || 0; // Amount in cents

    return NextResponse.json({
      success: true,
      usage: {
        totalAmountDue: upcomingInvoice.amount_due,
        currentUsage: subscription.items.data[0].quantity || 0,
        ratePerMinute,
        billingPeriodStart: currentPeriodStart.toISOString(),
        billingPeriodEnd: currentPeriodEnd.toISOString(),
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

export const runtime = 'edge';