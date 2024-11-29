//Users/bobbygilbert/Documents/Github/platforms-starter-kit/components/PricingTable.tsx

"use client"

import React from 'react';
import { Check } from 'lucide-react';
import { STRIPE_CONFIG, SubscriptionTier, BillingInterval } from '@/lib/stripe-config';

const PricingTable = ({ 
  currentTier,
  stripePortalUrl,
  customerId 
}: { 
  currentTier: SubscriptionTier;
  stripePortalUrl?: string | null;
  customerId?: string | null;
}) => {
  const [billingInterval, setBillingInterval] = React.useState<BillingInterval>('MONTHLY');
  const [loading, setLoading] = React.useState<SubscriptionTier | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubscribe = async (tier: SubscriptionTier) => {
    try {
      setLoading(tier);
      setError(null);
      
      const response = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier,
          interval: billingInterval,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subscription');
      }

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        window.location.href = '/settings/billing';
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process subscription');
    } finally {
      setLoading(null);
    }
  };

  const calculatePrice = (tier: SubscriptionTier) => {
    const config = STRIPE_CONFIG.TIERS[tier];
    const monthlyPrice = tier === 'BASIC' ? 0 : 
      tier === 'PRO' ? 49 : 199;
    
    if (billingInterval === 'YEARLY') {
      const annualPrice = monthlyPrice * 12;
      const discount = STRIPE_CONFIG.SETTINGS.ANNUAL_DISCOUNT_PERCENTAGE;
      return {
        amount: Math.floor(annualPrice * (1 - discount / 100)),
        interval: '/year'
      };
    }
    
    return {
      amount: monthlyPrice,
      interval: '/month'
    };
  };

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8">
      {/* Billing Interval Toggle */}
      <div className="flex justify-center mb-8">
        <div className="relative flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setBillingInterval('MONTHLY')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              billingInterval === 'MONTHLY'
                ? 'bg-white shadow-sm'
                : 'hover:bg-gray-50'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('YEARLY')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              billingInterval === 'YEARLY'
                ? 'bg-white shadow-sm'
                : 'hover:bg-gray-50'
            }`}
          >
            Yearly ({STRIPE_CONFIG.SETTINGS.ANNUAL_DISCOUNT_PERCENTAGE}% off)
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 text-sm text-red-500 bg-red-50 rounded-md text-center">
          {error}
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {(['BASIC', 'PRO', 'GROWTH'] as const).map((tier) => {
          const price = calculatePrice(tier);
          const config = STRIPE_CONFIG.TIERS[tier];
          const isCurrentTier = currentTier === tier;
          
          return (
            <div
              key={tier}
              className={`rounded-2xl p-8 ring-1 ${
                tier === 'PRO'
                  ? 'ring-2 ring-primary shadow-lg'
                  : 'ring-gray-200'
              }`}
            >
              <h3 className="text-lg font-semibold leading-8">
                {tier.charAt(0) + tier.slice(1).toLowerCase()}
              </h3>

              {/* Price */}
              <p className="mt-4 flex items-baseline gap-x-2">
                <span className="text-4xl font-bold tracking-tight">
                  ${price.amount}
                </span>
                <span className="text-base text-gray-500">
                  {price.interval}
                </span>
              </p>

              {/* Features List */}
              <ul className="mt-8 space-y-3">
                <li className="flex gap-x-3">
                  <Check className="h-6 w-5 flex-none text-primary" />
                  <span>
                    {config.LIMITS.ONBOARDS === -1
                      ? 'Unlimited agents'
                      : `${config.LIMITS.ONBOARDS} agents`}
                  </span>
                </li>
                <li className="flex gap-x-3">
                  <Check className="h-6 w-5 flex-none text-primary" />
                  <span>
                    {config.LIMITS.SESSIONS === -1
                      ? 'Unlimited sessions'
                      : `${config.LIMITS.SESSIONS} sessions/month`}
                  </span>
                </li>
                <li className="flex gap-x-3">
                  <Check className="h-6 w-5 flex-none text-primary" />
                  <span>{config.LIMITS.INPUT_TOKENS.toLocaleString()} input tokens/month</span>
                </li>
                <li className="flex gap-x-3">
                  <Check className="h-6 w-5 flex-none text-primary" />
                  <span>{config.LIMITS.OUTPUT_TOKENS.toLocaleString()} output tokens/month</span>
                </li>
                <li className="flex gap-x-3">
                  <Check className="h-6 w-5 flex-none text-primary" />
                  <span>
                    {config.LIMITS.INTEGRATIONS === -1
                      ? 'Unlimited integrations'
                      : `${config.LIMITS.INTEGRATIONS} integrations`}
                  </span>
                </li>
                {tier !== 'BASIC' && (
                  <>
                    <li className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-primary" />
                      <span>Custom domain</span>
                    </li>
                    <li className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-primary" />
                      <span>Team collaboration</span>
                    </li>
                  </>
                )}
                {tier === 'GROWTH' && (
                  <li className="flex gap-x-3">
                    <Check className="h-6 w-5 flex-none text-primary" />
                    <span>Advanced analytics</span>
                  </li>
                )}
              </ul>

              {/* Action Button */}
              <div className="mt-8">
                {isCurrentTier ? (
                  <button
                    onClick={() => stripePortalUrl && window.location.assign(stripePortalUrl)}
                    disabled={!stripePortalUrl}
                    className="w-full rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Manage Subscription
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(tier)}
                    disabled={loading === tier}
                    className="w-full rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading === tier ? 'Processing...' : tier === 'BASIC' ? 'Current Plan' : `Upgrade to ${tier.toLowerCase()}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PricingTable;