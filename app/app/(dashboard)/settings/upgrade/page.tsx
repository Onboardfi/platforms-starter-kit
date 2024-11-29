import React from 'react';
import StripePricingTable from '@/components/StripePricingTable';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { eq } from 'drizzle-orm';
import { organizations } from '@/lib/schema';
import { stripe } from '@/lib/stripe';
import { redirect } from 'next/navigation';
import type { Stripe } from 'stripe';
import { STRIPE_CONFIG } from '@/lib/stripe-config';
import { Shield, Bot, Layout, Users } from 'lucide-react';
import type { SubscriptionTier } from '@/lib/stripe-config';

function getPlanDetails(subscription: Stripe.Subscription, organization: any): {
  name: string;
  interval: string;
  nextBillingDate: string;
  features: {
    agents: number;
    sessions: number;
    customDomain: boolean;
    analytics: string;
  };
} {
  const subscriptionMetadata = organization.metadata?.stripe?.subscription?.metadata;
  const tier = (subscriptionMetadata?.tier || 'BASIC') as SubscriptionTier;
  const tierConfig = STRIPE_CONFIG.TIERS[tier];
  
  const interval = subscription.items.data[0]?.price.recurring?.interval || 'month';
  const intervalFormatted = interval === 'year' ? 'annually' : 'monthly';

  const nextBillingDate = new Date(subscription.current_period_end * 1000)
    .toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

  return {
    name: `${tier} Plan`,
    interval: intervalFormatted,
    nextBillingDate,
    features: {
      agents: tierConfig.LIMITS.ONBOARDS,
      sessions: tierConfig.LIMITS.SESSIONS,
      customDomain: tierConfig.FEATURES.CUSTOM_DOMAIN,
      analytics: tier === 'GROWTH' ? 'Advanced' : tier === 'PRO' ? 'Basic' : 'Limited'
    }
  };
}

function FeatureCard({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg">
      <Icon className="w-5 h-5 text-dream-cyan" />
      <div>
        <p className="text-sm text-neutral-400">{label}</p>
        <p className="text-sm font-medium text-white">
          {typeof value === 'number' && value === -1 ? 'Unlimited' : value}
        </p>
      </div>
    </div>
  );
}

async function createPortalSession(stripeCustomerId: string) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
      configuration: process.env.STRIPE_PORTAL_CONFIG_ID,
    });
    return session;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
}

export default async function UpgradePage() {
  const session = await getSession();
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  const organizationId = session.organizationId;
  if (!organizationId) {
    redirect('/');
  }

  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!organization) {
    redirect('/');
  }

  let subscription: Stripe.Subscription | null = null;
  let planDetails = null;
  let portalSession = null;
  
  let stripeCustomerId = organization.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: session.user.email!,
      name: organization.name,
      metadata: {
        organizationId: organization.id,
      },
    });

    await db
      .update(organizations)
      .set({
        stripeCustomerId: customer.id,
      })
      .where(eq(organizations.id, organization.id));

    stripeCustomerId = customer.id;
  }

  const baseSubscriptionId = organization.metadata?.subscriptions?.base;
  const currentTier = organization.metadata?.stripe?.subscription?.metadata?.tier || 'BASIC';

  if (baseSubscriptionId) {
    try {
      subscription = await stripe.subscriptions.retrieve(
        baseSubscriptionId,
        {
          expand: ['items.data.price.product']
        }
      );

      if (subscription) {
        planDetails = getPlanDetails(subscription, organization);
        
        if (currentTier !== 'BASIC') {
          portalSession = await createPortalSession(stripeCustomerId);
        }
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  }

  let customerSession = null;
  if (currentTier === 'BASIC') {
    try {
      customerSession = await stripe.customerSessions.create({
        customer: stripeCustomerId,
        components: {
          pricing_table: {
            enabled: true
          }
        }
      });
    } catch (error) {
      console.error('Error creating customer session:', error);
    }
  }

  const renderProToGrowthContent = () => (
    <div className="mt-8">
      <div className="relative p-8 bg-neutral-900 rounded-lg border border-dream-cyan/20 overflow-hidden">
        <div 
          className="absolute inset-0 bg-gradient-to-br from-dream-purple/10 via-dream-cyan/10 to-dream-cyan/10" 
          style={{ filter: "blur(40px)" }} 
        />
        
        <div className="relative space-y-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dream-cyan/10">
              <Shield className="w-8 h-8 text-dream-cyan" />
            </div>
            <div>
              <div className="inline-block px-3 py-1 bg-dream-cyan/10 rounded-full text-dream-cyan text-xs mb-2">
                GROWTH PLAN
              </div>
              <h2 className="text-2xl font-semibold text-white">
                Unlock Advanced Features
              </h2>
            </div>
            <p className="text-neutral-400 max-w-2xl">
              Take your onboarding to the next level with our most powerful plan. Get access to advanced analytics, 
              unlimited sessions, and premium support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.05]">
              <Bot className="w-6 h-6 text-dream-cyan mb-3" />
              <h3 className="text-white font-medium mb-2">Advanced Analytics</h3>
              <p className="text-sm text-neutral-400">
                Get deeper insights into your onboarding performance with detailed metrics and custom reports
              </p>
            </div>
            <div className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.05]">
              <Users className="w-6 h-6 text-dream-cyan mb-3" />
              <h3 className="text-white font-medium mb-2">Team Collaboration</h3>
              <p className="text-sm text-neutral-400">
                Enhanced team features with advanced permissions and collaborative tools
              </p>
            </div>
            <div className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.05]">
              <Layout className="w-6 h-6 text-dream-cyan mb-3" />
              <h3 className="text-white font-medium mb-2">Priority Support</h3>
              <p className="text-sm text-neutral-400">
                Get priority access to our support team and implementation specialists
              </p>
            </div>
          </div>

          <div className="p-6 bg-white/[0.02] rounded-lg border border-white/[0.05]">
            <h3 className="text-lg font-medium text-white mb-4">What You'll Get by Upgrading</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm text-neutral-400 mb-2">Current Pro Plan</h4>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-neutral-300">
                    <div className="w-4 h-4 mr-2 flex items-center justify-center">•</div>
                    Basic Analytics
                  </li>
                  <li className="flex items-center text-sm text-neutral-300">
                    <div className="w-4 h-4 mr-2 flex items-center justify-center">•</div>
                    Standard Support
                  </li>
                  <li className="flex items-center text-sm text-neutral-300">
                    <div className="w-4 h-4 mr-2 flex items-center justify-center">•</div>
                    Basic Team Features
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm text-dream-cyan mb-2">Growth Plan</h4>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-white">
                    <div className="w-4 h-4 mr-2 text-dream-cyan">✓</div>
                    Advanced Analytics Dashboard
                  </li>
                  <li className="flex items-center text-sm text-white">
                    <div className="w-4 h-4 mr-2 text-dream-cyan">✓</div>
                    Priority Support & Training
                  </li>
                  <li className="flex items-center text-sm text-white">
                    <div className="w-4 h-4 mr-2 text-dream-cyan">✓</div>
                    Advanced Team Collaboration
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          {currentTier === 'BASIC' ? (
            <>
              <h1 className="text-3xl font-bold sm:text-5xl text-white">
                Choose Your Plan
              </h1>
              <p className="mt-4 text-neutral-400">
                Scale your onboarding as your business grows
              </p>
            </>
          ) : currentTier === 'PRO' ? (
            <>
              <h1 className="text-3xl font-bold sm:text-5xl text-white">
                Upgrade to Growth
              </h1>
              <p className="mt-4 text-neutral-400">
                Take your team to the next level with our most comprehensive plan
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold sm:text-5xl text-white">
                Manage Your Subscription
              </h1>
              <p className="mt-4 text-neutral-400">
                Update your subscription, billing information, and view invoices
              </p>
            </>
          )}
        </div>

        {planDetails && currentTier !== 'PRO' && (
          <div className="mt-8">
            <div className="p-6 bg-neutral-900 rounded-lg border border-neutral-800">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-dream-cyan" />
                <div>
                  <div className="inline-block px-3 py-1 bg-neutral-800 rounded-full text-white text-xs mb-1">
                    Current Plan
                  </div>
                  <h2 className="text-xl font-semibold text-white">
                    {planDetails.name}
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <FeatureCard 
                  icon={Bot} 
                  label="Agents" 
                  value={planDetails.features.agents} 
                />
                <FeatureCard 
                  icon={Users} 
                  label="Sessions" 
                  value={planDetails.features.sessions} 
                />
                <FeatureCard 
                  icon={Layout} 
                  label="Custom Domain" 
                  value={planDetails.features.customDomain ? 'Included' : 'Not Available'} 
                />
                <FeatureCard 
                  icon={Users} 
                  label="Analytics" 
                  value={planDetails.features.analytics} 
                />
              </div>

              <div className="mt-4 pt-4 border-t border-neutral-800">
                <div className="flex items-center justify-between text-sm">
                  <p className="text-neutral-400">
                    Billed {planDetails.interval}
                  </p>
                  <p className="text-neutral-400">
                    Next billing date: {planDetails.nextBillingDate}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8">
          {currentTier === 'BASIC' && customerSession ? (
            <StripePricingTable
              customerSessionClientSecret={customerSession.client_secret}
              baseSubscriptionId={organization.metadata?.subscriptions?.base}
              customerId={stripeCustomerId}
            />
          ) : currentTier === 'PRO' ? (
            <>
              {renderProToGrowthContent()}
              <div className="mt-8 text-center">
                <a
                  href={portalSession?.url}
                  className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-black bg-dream-cyan hover:bg-dream-cyan/90 transition-colors duration-200 shadow-lg shadow-dream-cyan/20"
                >
                  Upgrade to Growth Plan
                </a>
                <p className="mt-3 text-sm text-neutral-400">
                  You'll be taken to the customer portal to complete your upgrade
                </p>
              </div>
            </>
          ) : portalSession ? (
            <div className="text-center">
              <a
                href={portalSession.url}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-dream-cyan hover:bg-dream-cyan/90 transition-colors duration-200"
              >
                Manage Your Subscription
              </a>
            </div>
          ) : null}
        </div>

        <div className="mt-12 text-center space-y-4">
          {!subscription && (
            <p className="text-sm text-neutral-400">
              All plans include a {STRIPE_CONFIG.SETTINGS.TRIAL_DAYS}-day free trial. 
              Cancel anytime.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}