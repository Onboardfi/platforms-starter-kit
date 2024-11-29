///Users/bobbygilbert/Documents/Github/platforms-starter-kit/app/api/stripe/billing/route.ts


import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { stripe } from '@/lib/stripe';
import { eq } from 'drizzle-orm';
import db from '@/lib/db';
import { organizations, usageLogs } from '@/lib/schema';
import { STRIPE_CONFIG, SubscriptionTier } from '@/lib/stripe-config';
import type { Stripe } from 'stripe';
import type { BillingApiResponse } from '@/types/billing';
import type { SubscriptionMetadata, TierFeatureLimits } from '@/lib/schema';


// Helper to format subscription status
function formatSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionMetadata['status'] {
  switch (status) {
    case 'active':
      return 'active';
    case 'canceled':
      return 'canceled';
    case 'incomplete':
      return 'incomplete';
    case 'past_due':
      return 'past_due';
    default:
      return 'incomplete';
  }
}

// Helper to get tier limits
function getTierLimits(tier: SubscriptionTier): TierFeatureLimits {
  return {
    AGENTS: STRIPE_CONFIG.TIERS[tier].LIMITS.ONBOARDS,
    ONBOARDING_SESSIONS: STRIPE_CONFIG.TIERS[tier].LIMITS.SESSIONS,
    INTEGRATIONS_PER_AGENT: STRIPE_CONFIG.TIERS[tier].LIMITS.INTEGRATIONS,
    CUSTOM_DOMAIN: tier !== 'BASIC',
    ADVANCED_ANALYTICS: tier === 'GROWTH',
    TEAM_COLLABORATION: tier !== 'BASIC'
  };
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, token.organizationId as string)
    });

    if (!organization?.stripeCustomerId) {
      return NextResponse.json({ error: 'No billing information found' }, { status: 404 });
    }

    // Get Stripe customer and subscription info
    const [customer, subscriptions, paymentMethods] = await Promise.all([
      stripe.customers.retrieve(organization.stripeCustomerId),
      stripe.subscriptions.list({
        customer: organization.stripeCustomerId,
        limit: 1,
        status: 'active',
        expand: ['data.default_payment_method']
      }),
      stripe.paymentMethods.list({
        customer: organization.stripeCustomerId,
        type: 'card'
      })
    ]);

    const subscription = subscriptions.data[0];
    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    const defaultPaymentMethod = paymentMethods.data[0];

    // Get subscription metadata from organization
    const subscriptionMetadata = organization.metadata.stripe?.subscription?.metadata;
    const currentTier = (subscriptionMetadata?.tier || 'BASIC') as SubscriptionTier;
    
    // Get usage data
    const usageData = await db
      .select({
        inputTokens: usageLogs.promptTokens,
        outputTokens: usageLogs.completionTokens
      })
      .from(usageLogs)
      .where(eq(usageLogs.organizationId, organization.id));

    // Get billing history
    const invoices = await stripe.invoices.list({
      customer: organization.stripeCustomerId,
      limit: 12,
      expand: ['data.payment_intent']
    });

    // Format response
    const response: BillingApiResponse = {
      currentTier,
      usageData: {
        inputTokens: usageData.reduce((sum, log) => sum + log.inputTokens, 0),
        outputTokens: usageData.reduce((sum, log) => sum + log.outputTokens, 0),
        agents: subscriptionMetadata?.currentUsage?.agentCount || 0,
        sessions: subscriptionMetadata?.currentUsage?.sessionCount || 0
      },
      subscription: {
        interval: subscription.items.data[0].plan.interval === 'year' ? 'YEARLY' : 'MONTHLY',
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        status: formatSubscriptionStatus(subscription.status)
      },
      billingHistory: invoices.data.map(invoice => ({
        date: new Date(invoice.created * 1000).toLocaleDateString(),
        amount: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: invoice.currency
        }).format(invoice.amount_paid / 100),
        status: invoice.paid ? 'paid' : 'failed',
        invoiceId: invoice.id
      })),
      paymentMethod: defaultPaymentMethod?.card ? {
        last4: defaultPaymentMethod.card.last4 || '',
        expMonth: defaultPaymentMethod.card.exp_month || 0,
        expYear: defaultPaymentMethod.card.exp_year || 0,
        brand: defaultPaymentMethod.card.brand || ''
      } : null
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching billing data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing information' },
      { status: 500 }
    );
  }
}