// /Users/bobbygilbert/Documents/Github/platforms-starter-kit/app/api/organizations/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { organizations, organizationMemberships, users } from '@/lib/schema';
import { createId } from '@paralleldrive/cuid2';
import { stripe } from '@/lib/stripe';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { STRIPE_CONFIG, SubscriptionTier } from '@/lib/stripe-config';
import { analytics } from '@/lib/segment'; // Import the analytics instance

// Helper function to merge and update user metadata
async function updateUserMetadata(userId: string, newMetadata: Partial<Record<string, any>>) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { metadata: true },
    });
    
    // Ensure we have an object to work with
    const existingMetadata = user?.metadata || {};
    const updatedMetadata = {
      ...existingMetadata,
      ...newMetadata,
      updatedAt: new Date().toISOString()
    };
    
    await db.update(users)
      .set({ metadata: updatedMetadata })
      .where(eq(users.id, userId));
      
    return true;
  } catch (error) {
    console.error('Failed to update user metadata:', error);
    return false;
  }
}

// Helper function to generate a unique slug
function generateSlug(name: string): string {
  const timestamp = Date.now();
  const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `org-${timestamp}-${sanitizedName}`.slice(0, 50);
}

// Helper function to setup Stripe meters and pricing
async function setupStripeMetersAndPricing() {
  try {
    console.log('Checking for existing Stripe meters...');
    
    // 1. Get existing meters
    const existingMeters = await stripe.billing.meters.list({ 
      status: 'active',
      limit: 100 // Adjust if needed
    });

    // 2. Find existing meters by event name
    let inputTokensMeter = existingMeters.data.find(m => m.event_name === 'input_tokens');
    let outputTokensMeter = existingMeters.data.find(m => m.event_name === 'output_tokens');

    // 3. Create input tokens meter if it doesn't exist
    if (!inputTokensMeter) {
      console.log('Creating new input tokens meter...');
      inputTokensMeter = await stripe.billing.meters.create({
        display_name: 'Input Tokens',
        event_name: 'input_tokens',
        default_aggregation: {
          formula: 'sum',
        },
        value_settings: {
          event_payload_key: 'value',
        },
        customer_mapping: {
          type: 'by_id',
          event_payload_key: 'stripe_customer_id',
        },
      });
    } else {
      console.log('Using existing input tokens meter:', inputTokensMeter.id);
    }

    // 4. Create output tokens meter if it doesn't exist
    if (!outputTokensMeter) {
      console.log('Creating new output tokens meter...');
      outputTokensMeter = await stripe.billing.meters.create({
        display_name: 'Output Tokens',
        event_name: 'output_tokens',
        default_aggregation: {
          formula: 'sum',
        },
        value_settings: {
          event_payload_key: 'value',
        },
        customer_mapping: {
          type: 'by_id',
          event_payload_key: 'stripe_customer_id',
        },
      });
    } else {
      console.log('Using existing output tokens meter:', outputTokensMeter.id);
    }

    // 5. Get existing prices
    const existingPrices = await stripe.prices.list({
      active: true,
      limit: 100,
      type: 'recurring',
      lookup_keys: ['input_tokens_price', 'output_tokens_price']
    });

    // 6. Find existing prices by lookup key
    let inputTokensPrice = existingPrices.data.find(p => p.lookup_key === 'input_tokens_price');
    let outputTokensPrice = existingPrices.data.find(p => p.lookup_key === 'output_tokens_price');

    // 7. Create input tokens price if it doesn't exist
    if (!inputTokensPrice) {
      console.log('Creating new input tokens price...');
      inputTokensPrice = await stripe.prices.create({
        nickname: 'Input Tokens',
        currency: 'usd',
        recurring: {
          usage_type: 'metered',
          aggregate_usage: 'sum',
          interval: 'month'
        },
        lookup_key: 'input_tokens_price',
        billing_scheme: 'per_unit',
        unit_amount: 15, // $0.015 per 1K tokens
        product_data: {
          name: 'Input Tokens',
          metadata: {
            meter_id: inputTokensMeter.id
          }
        },
        transform_quantity: {
          divide_by: 1000,
          round: 'up'
        }
      });
    } else {
      console.log('Using existing input tokens price:', inputTokensPrice.id);
    }

    // 8. Create output tokens price if it doesn't exist
    if (!outputTokensPrice) {
      console.log('Creating new output tokens price...');
      outputTokensPrice = await stripe.prices.create({
        nickname: 'Output Tokens',
        currency: 'usd',
        recurring: {
          usage_type: 'metered',
          aggregate_usage: 'sum',
          interval: 'month'
        },
        lookup_key: 'output_tokens_price',
        billing_scheme: 'per_unit',
        unit_amount: 20, // $0.020 per 1K tokens
        product_data: {
          name: 'Output Tokens',
          metadata: {
            meter_id: outputTokensMeter.id
          }
        },
        transform_quantity: {
          divide_by: 1000,
          round: 'up'
        }
      });
    } else {
      console.log('Using existing output tokens price:', outputTokensPrice.id);
    }

    // 9. Log setup summary
    console.log('Stripe meters and prices setup complete:', {
      meters: {
        input: {
          id: inputTokensMeter.id,
          status: inputTokensMeter.status,
          isNew: !existingMeters.data.find(m => m.event_name === 'input_tokens')
        },
        output: {
          id: outputTokensMeter.id,
          status: outputTokensMeter.status,
          isNew: !existingMeters.data.find(m => m.event_name === 'output_tokens')
        }
      },
      prices: {
        input: {
          id: inputTokensPrice.id,
          isNew: !existingPrices.data.find(p => p.lookup_key === 'input_tokens_price')
        },
        output: {
          id: outputTokensPrice.id,
          isNew: !existingPrices.data.find(p => p.lookup_key === 'output_tokens_price')
        }
      }
    });

    // 10. Return the resources
    return {
      inputTokens: {
        meter: inputTokensMeter,
        price: inputTokensPrice
      },
      outputTokens: {
        meter: outputTokensMeter,
        price: outputTokensPrice
      }
    };

  } catch (error) {
    console.error('Failed to setup Stripe meters and pricing:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Helper function to create both subscriptions
async function setupCombinedSubscriptions(
  customerId: string,
  organizationId: string,
  organizationName: string,
) {
  // Start with Basic tier
  const tier: SubscriptionTier = 'BASIC';
  
  try {
    // 1. Create base subscription (free for Basic tier)
    const baseSubscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price: STRIPE_CONFIG.TIERS.BASIC.MONTHLY,
      }],
      metadata: {
        organizationId,
        type: 'base_tier',
        tier
      }
    });

    // 2. Get metered pricing resources
    const stripeResources = await setupStripeMetersAndPricing();

    // 3. Create metered subscription with usage limits from tier
    const meteredSubscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: stripeResources.inputTokens.price.id,
          metadata: {
            type: 'input_tokens',
            limit: STRIPE_CONFIG.TIERS.BASIC.LIMITS.INPUT_TOKENS,
            rate: STRIPE_CONFIG.METERED.RATES.BASIC.INPUT_TOKENS
          }
        },
        {
          price: stripeResources.outputTokens.price.id,
          metadata: {
            type: 'output_tokens',
            limit: STRIPE_CONFIG.TIERS.BASIC.LIMITS.OUTPUT_TOKENS,
            rate: STRIPE_CONFIG.METERED.RATES.BASIC.OUTPUT_TOKENS
          }
        }
      ],
      metadata: {
        organizationId,
        type: 'metered_usage',
        tier
      },
      payment_behavior: 'default_incomplete',
      collection_method: 'charge_automatically',
      description: `Metered usage subscription for ${organizationName}`
    });

    return {
      baseSubscription,
      meteredSubscription,
      resources: stripeResources,
      tier
    };
  } catch (error) {
    console.error('Failed to setup subscriptions:', error);
    throw error;
  }
}

// Main API handler
export async function POST(req: Request) {
  console.log('Organizations API - Received create organization request');
  
  try {
    // 1. Get and validate session with explicit authOptions
    const session = await getServerSession(authOptions);
    
    console.log('Organizations API - Session details:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      email: session?.user?.email,
      sessionData: JSON.stringify(session, null, 2)
    });
    
    if (!session?.user?.id) {
      console.error('Organizations API - Invalid session');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Verify user exists in database
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id)
    });

    if (!user) {
      console.error('Organizations API - User not found in database');
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 3. Parse and validate request body
    const body = await req.json();
    console.log('Request body:', body);

    // Add validation for required fields
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    const { name, metadata = {} } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    // 4. Generate and validate slug
    const slug = generateSlug(name);
    const existingOrg = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug)
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: "Organization with this slug already exists" },
        { status: 409 }
      );
    }

    // 5. Prepare organization data
    const orgId = createId();
    const now = new Date();
    
    const orgData = {
      id: orgId,
      name: name.trim(),
      slug,
      createdBy: user.id,
      metadata: {
        ...metadata,
        createdAt: now.toISOString(),
      },
      createdAt: now,
      updatedAt: now
    };

    // 6. Execute transaction with enhanced error handling
    const result = await db.transaction(async (tx) => {
      // Create organization
      const [org] = await tx
        .insert(organizations)
        .values(orgData)
        .returning();

      if (!org) {
        throw new Error('Failed to create organization record');
      }

      // Create owner membership
      const [membership] = await tx
        .insert(organizationMemberships)
        .values({
          id: createId(),
          organizationId: org.id,
          userId: user.id,
          role: 'owner',
          createdAt: now,
          updatedAt: now
        })
        .returning();

      if (!membership) {
        throw new Error('Failed to create organization membership');
      }

      // Handle Stripe integration
      if (stripe) {
        try {
          console.log('Setting up Stripe billing...');

          // Create Stripe customer
          const customer = await stripe.customers.create({
            email: user.email,
            metadata: {
              organizationId: org.id,
              userId: user.id,
            },
            name: org.name,
          });

          // Setup both subscription types
          const subscriptionSetup = await setupCombinedSubscriptions(
            customer.id,
            org.id,
            org.name
          );

          // Update organization with all Stripe details
          await tx
            .update(organizations)
            .set({ 
              stripeCustomerId: customer.id,
              stripeSubscriptionId: subscriptionSetup.baseSubscription.id,
              updatedAt: now,
              metadata: {
                ...org.metadata,
                stripeEnabled: true,
                subscriptions: {
                  base: subscriptionSetup.baseSubscription.id,
                  metered: subscriptionSetup.meteredSubscription.id
                },
                currentTier: subscriptionSetup.tier,
                limits: STRIPE_CONFIG.TIERS[subscriptionSetup.tier].LIMITS,
                rates: STRIPE_CONFIG.METERED.RATES[subscriptionSetup.tier],
                stripeMeters: {
                  inputTokens: {
                    meterId: subscriptionSetup.resources.inputTokens.meter.id,
                    priceId: subscriptionSetup.resources.inputTokens.price.id
                  },
                  outputTokens: {
                    meterId: subscriptionSetup.resources.outputTokens.meter.id,
                    priceId: subscriptionSetup.resources.outputTokens.price.id
                  }
                }
              }
            })
            .where(eq(organizations.id, org.id));
            
          org.stripeCustomerId = customer.id;
          org.stripeSubscriptionId = subscriptionSetup.baseSubscription.id;

          console.log('Stripe setup completed:', {
            organizationId: org.id,
            customerId: customer.id,
            subscriptions: {
              base: subscriptionSetup.baseSubscription.id,
              metered: subscriptionSetup.meteredSubscription.id
            },
            tier: subscriptionSetup.tier
          });
        } catch (error) {
          console.error('Failed to setup Stripe billing:', error);
          // Log detailed error but don't block organization creation
          console.error('Stripe setup error details:', {
            orgId: org.id,
            userId: user.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

   // Update user metadata
  const userMetadataUpdate = {
    organizationId: org.id,
    needsOnboarding: true,
    lastOrganizationCreatedAt: now.toISOString(),
  };


      const metadataUpdated = await updateUserMetadata(user.id, userMetadataUpdate);
      if (!metadataUpdated) {
        console.warn('Failed to update user metadata, but organization was created');
      }

      return {
        organization: org,
        membership
      };
    });

    // 7. Revalidate cached paths
    revalidatePath('/');
    revalidatePath('/organizations');
    revalidatePath(`/organizations/${result.organization.id}`);

    // 8. Add a Track call to Segment after organization creation
    try {
      await analytics.track({
        userId: session.user.id,
        event: 'Organization Created',
        properties: {
          organizationId: result.organization.id,
          organizationName: result.organization.name,
          timestamp: new Date(),
        },
      });
      console.log('Server-side event tracked: Organization Created');
    } catch (error) {
      console.error('Failed to send server-side analytics event:', error);
    }
    // 9. Return response
    return NextResponse.json({
      id: result.organization.id,
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
        metadata: result.organization.metadata,
        stripeCustomerId: result.organization.stripeCustomerId,
        stripeSubscriptionId: result.organization.stripeSubscriptionId
      },
      membership: {
        role: result.membership.role
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });

  } catch (error: any) {
    console.error('Organizations API - Error creating organization:', error);
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { 
          error: error.message || 'Failed to create organization',
          stack: error.stack
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'An error occurred while creating the organization' },
      { status: 500 }
    );
  }
}
