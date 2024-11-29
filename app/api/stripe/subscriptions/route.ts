// app/api/stripe/subscription/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { stripe } from '@/lib/stripe';
import { eq } from 'drizzle-orm';
import db from '@/lib/db';
import { organizations, users } from '@/lib/schema';
import { STRIPE_CONFIG, SubscriptionTier } from '@/lib/stripe-config';
import type { Stripe } from 'stripe';
import type { SubscriptionMetadata, TierFeatureLimits } from '@/lib/schema';

// Helper to validate and format subscription status
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
    TEAM_COLLABORATION: tier !== 'BASIC',
  };
}

export async function POST(req: NextRequest) {
  console.log('POST /api/stripe/subscription called');

  try {
    // Authenticate the user
    const token = await getToken({ req });
    if (!token?.sub) {
      console.warn('Unauthorized access attempt.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract organization ID from token
    const organizationId = token.organizationId as string;
    if (!organizationId) {
      console.warn('Organization ID missing in token.');
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Parse request body
    const { tier, interval = 'MONTHLY' } = await req.json();

    // Validate tier
    if (!tier || !STRIPE_CONFIG.TIERS[tier as SubscriptionTier]) {
      console.warn(`Invalid subscription tier received: ${tier}`);
      return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 });
    }

    // Fetch organization and user from the database
    const [organization, user] = await Promise.all([
      db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId),
      }),
      db.query.users.findFirst({
        where: eq(users.id, token.sub),
      }),
    ]);

    if (!organization) {
      console.warn(`Organization not found: ${organizationId}`);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (!user || !user.email) {
      console.warn(`User not found or email missing: ${token.sub}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId = organization.stripeCustomerId;
    if (!stripeCustomerId) {
      console.log(`Creating new Stripe customer for organization: ${organization.id}`);
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          organizationId: organization.id,
          userId: user.id,
        },
      });

      stripeCustomerId = customer.id;

      // Update organization with Stripe customer ID
      await db.update(organizations)
        .set({ stripeCustomerId: customer.id })
        .where(eq(organizations.id, organization.id));
      console.log(`Stripe customer created: ${customer.id}`);
    }

    // Determine the correct price ID based on tier and interval
    const tierConfig = STRIPE_CONFIG.TIERS[tier as SubscriptionTier];
    const priceId = interval === 'YEARLY' && 'YEARLY' in tierConfig
      ? tierConfig.YEARLY
      : tierConfig.MONTHLY;

    // Create Stripe checkout session
    console.log(`Creating Stripe checkout session for customer: ${stripeCustomerId}`);
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        organizationId: organization.id,
        type: 'base_tier',
        tier,
        interval,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
      subscription_data: {
        metadata: {
          organizationId: organization.id,
          type: 'base_tier',
          tier,
          interval,
        },
        trial_period_days: STRIPE_CONFIG.SETTINGS.TRIAL_DAYS,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    });

    console.log(`Stripe checkout session created: ${session.id}`);

    // Respond with the session URL and ID
    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  console.log('PUT /api/stripe/subscription called');

  try {
    // Authenticate the user
    const token = await getToken({ req });
    if (!token?.sub) {
      console.warn('Unauthorized access attempt.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract organization ID from token
    const organizationId = token.organizationId as string;
    if (!organizationId) {
      console.warn('Organization ID missing in token.');
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Parse request body
    const { subscriptionId, action } = await req.json();

    // Validate input
    if (!subscriptionId || !action) {
      console.warn('Subscription ID or action missing in request.');
      return NextResponse.json(
        { error: 'Subscription ID and action are required' },
        { status: 400 }
      );
    }

    // Fetch organization from the database
    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!organization?.stripeCustomerId) {
      console.warn(`Organization not found or Stripe customer ID missing: ${organizationId}`);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Retrieve the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (subscription.customer !== organization.stripeCustomerId) {
      console.warn(`Unauthorized access to subscription: ${subscriptionId}`);
      return NextResponse.json({ error: 'Unauthorized subscription access' }, { status: 403 });
    }

    let updatedSubscription: Stripe.Subscription;

    // Handle different actions
    switch (action) {
      case 'cancel':
        console.log(`Cancelling subscription at period end: ${subscriptionId}`);
        updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
          proration_behavior: 'none',
        });
        break;

      case 'resume':
        console.log(`Resuming subscription: ${subscriptionId}`);
        updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: false,
          proration_behavior: 'none',
        });
        break;

      case 'cancel_immediately':
        console.log(`Immediately cancelling subscription: ${subscriptionId}`);
        updatedSubscription = await stripe.subscriptions.cancel(subscriptionId);
        break;

      default:
        console.warn(`Invalid action received: ${action}`);
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Extract tier and interval from subscription metadata
    const currentTier = (updatedSubscription.metadata.tier || 'BASIC') as SubscriptionTier;
    const currentInterval = (updatedSubscription.metadata.interval || 'MONTHLY') as 'MONTHLY' | 'YEARLY';



    console.log(`Organization metadata updated for subscription: ${subscriptionId}`);

    // Respond with the updated subscription details
    return NextResponse.json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
        currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
      },
    });

  } catch (error) {
    console.error('Error managing subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to manage subscription' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  console.log('GET /api/stripe/subscription called');

  try {
    // Authenticate the user
    const token = await getToken({ req });
    if (!token?.sub) {
      console.warn('Unauthorized access attempt.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract organization ID from token
    const organizationId = token.organizationId as string;
    if (!organizationId) {
      console.warn('Organization ID missing in token.');
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Fetch organization from the database
    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!organization?.stripeCustomerId) {
      console.warn(`Organization not found or Stripe customer ID missing: ${organizationId}`);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Retrieve subscriptions from Stripe
    console.log(`Fetching subscriptions for customer: ${organization.stripeCustomerId}`);
    const subscriptions = await stripe.subscriptions.list({
      customer: organization.stripeCustomerId,
      expand: ['data.latest_invoice', 'data.default_payment_method'],
    });

    // Map subscriptions to a cleaner format
    const formattedSubscriptions = subscriptions.data.map((sub) => ({
      id: sub.id,
      status: sub.status,
      tier: sub.metadata.tier || 'BASIC',
      interval: sub.metadata.interval || 'MONTHLY',
      currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      items: sub.items.data.map((item) => ({
        id: item.id,
        price: item.price,
        quantity: item.quantity,
      })),
    }));

    console.log(`Fetched ${formattedSubscriptions.length} subscriptions.`);

    // Respond with the subscriptions
    return NextResponse.json({
      subscriptions: formattedSubscriptions,
    });

  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}
