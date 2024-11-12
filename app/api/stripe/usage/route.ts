import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import db from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
  try {
    // Get user ID from request header
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
          currentUsage: 0,
          ratePerMinute: 10, // $0.10 per minute in cents
          billingPeriodStart: new Date().toISOString(),
          billingPeriodEnd: new Date().toISOString(),
          subscriptionStatus: 'inactive',
        }
      });
    }

    // Get current billing period
    const currentPeriodStart = new Date(subscription.current_period_start * 1000);
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

    // Get price per minute
    const price = await stripe.prices.retrieve(subscription.items.data[0].price.id);
    const ratePerMinute = price.unit_amount || 10; // Default to $0.10 in cents

    // Get upcoming invoice if available
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

export const runtime = 'nodejs';