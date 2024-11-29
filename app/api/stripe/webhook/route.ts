// app/api/stripe/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import db from '@/lib/db';
import { eq } from 'drizzle-orm';
import { organizations } from '@/lib/schema';
import type {
  SubscriptionMetadata,
  MeteredUsageMetadata,
  TierFeatureLimits,
  OrganizationMetadata,
} from '@/lib/schema';
import { STRIPE_CONFIG } from '@/lib/stripe-config';
import type { Stripe } from 'stripe';

export async function POST(req: NextRequest) {
  const buf = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) {
      console.error('Missing Stripe signature or webhook secret');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error('Error verifying Stripe webhook signature:', err);
    return new NextResponse('Invalid signature', { status: 400 });
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id);

  const customerId = session.customer as string;
  const organization = await findOrganization(customerId);

  if (!organization) return;

  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    await handleSubscriptionEvent(subscription);
  }
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const organization = await findOrganization(customerId);

  if (!organization) return;

  const isMetered = subscription.items.data.some((item) =>
    item.price.lookup_key?.includes('token') || item.price.nickname?.includes('Token')
  );

  const currentMetadata = organization.metadata || {};
  const stripeData = initializeStripeData(currentMetadata);

  if (isMetered) {
    stripeData.metered = await handleMeteredSubscription(subscription);
  } else {
    stripeData.subscription = await handleBaseSubscription(subscription);
  }

  await updateOrganizationMetadata(organization.id, currentMetadata, stripeData);
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const organization = await findOrganization(customerId);

  if (!organization) return;

  // Add trial end notification logic here
  // You might want to send an email or create a notification
  console.log('Trial ending soon for organization:', organization.id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const organization = await findOrganization(customerId);

  if (!organization) return;

  // Add payment failure handling logic here
  console.log('Payment failed for organization:', organization.id);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const organization = await findOrganization(customerId);

  if (!organization) return;

  // Update usage quotas or handle other post-payment logic
  console.log('Payment succeeded for organization:', organization.id);
}

// Helper Functions

async function findOrganization(customerId: string) {
  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.stripeCustomerId, customerId),
  });

  if (!organization) {
    console.error('Organization not found for customerId:', customerId);
    return null;
  }

  return organization;
}

function initializeStripeData(currentMetadata: OrganizationMetadata): NonNullable<OrganizationMetadata['stripe']> {
  return currentMetadata.stripe ?? {
    stripeEnabled: true,
    subscription: {
      id: null,
      metadata: {} as SubscriptionMetadata,
    },
    metered: {
      id: null,
      metadata: {} as MeteredUsageMetadata,
    },
  };
}

async function handleMeteredSubscription(subscription: Stripe.Subscription) {
  return {
    id: subscription.id,
    metadata: {
      tokenRates: {
        INPUT_TOKENS: subscription.items.data[0]?.price.unit_amount || 0,
        OUTPUT_TOKENS: subscription.items.data[1]?.price.unit_amount || 0,
      },
      stripeMeters: {
        inputTokens: {
          meterId: subscription.items.data[0]?.price.id || '',
          priceId: subscription.items.data[0]?.id || '',
        },
        outputTokens: {
          meterId: subscription.items.data[1]?.price.id || '',
          priceId: subscription.items.data[1]?.id || '',
        },
      },
    },
  };
}

async function handleBaseSubscription(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0].price.id;
  const tier = getTierFromPrice(priceId);
  const interval = subscription.items.data[0].price.recurring?.interval === 'year' 
    ? 'YEARLY' as const 
    : 'MONTHLY' as const;
  const limits = getTierLimits(priceId);

  return {
    id: subscription.id,
    metadata: {
      tier,
      interval,
      status: subscription.status as SubscriptionMetadata['status'],
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      limits,
      currentUsage: {
        agentCount: 0,
        sessionCount: 0,
      },
    },
  };
}

async function updateOrganizationMetadata(
  organizationId: string,
  currentMetadata: OrganizationMetadata,
  stripeData: NonNullable<OrganizationMetadata['stripe']>
) {
  await db
    .update(organizations)
    .set({
      metadata: {
        ...currentMetadata,
        stripe: stripeData,
      },
    })
    .where(eq(organizations.id, organizationId));
}

function getTierFromPrice(priceId: string): SubscriptionMetadata['tier'] {
  const { TIERS } = STRIPE_CONFIG;
  if (priceId === TIERS.BASIC.MONTHLY || priceId === TIERS.BASIC.YEARLY) return 'BASIC';
  if (priceId === TIERS.PRO.MONTHLY || priceId === TIERS.PRO.YEARLY) return 'PRO';
  if (priceId === TIERS.GROWTH.MONTHLY || priceId === TIERS.GROWTH.YEARLY) return 'GROWTH';
  return 'BASIC';
}

function getTierLimits(priceId: string): TierFeatureLimits {
  const tier = getTierFromPrice(priceId);
  const { TIERS } = STRIPE_CONFIG;
  const tierConfig = TIERS[tier];

  return {
    AGENTS: tierConfig.LIMITS.ONBOARDS,
    ONBOARDING_SESSIONS: tierConfig.LIMITS.SESSIONS,
    INTEGRATIONS_PER_AGENT: tierConfig.LIMITS.INTEGRATIONS,
    CUSTOM_DOMAIN: tierConfig.FEATURES.CUSTOM_DOMAIN,
    ADVANCED_ANALYTICS: tierConfig.FEATURES.ADVANCED_ANALYTICS,
    TEAM_COLLABORATION: tierConfig.FEATURES.TEAM_COLLABORATION,
  };
}