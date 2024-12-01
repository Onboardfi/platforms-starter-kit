// /Users/bobbygilbert/Documents/Github/platforms-starter-kit/app/(dashboard)/settings/billing/page.tsx

"use client";

import React, { useEffect, useState } from 'react';
import { 
  CreditCard, 
  Receipt, 
  Clock, 
  Settings,
  Download,
  AlertCircle,
  CheckCircle2,
  Zap,
  Users,
  Layout,
  Gauge,
  Bot,
  Shield
} from "lucide-react";
import Link from "next/link";
import { STRIPE_CONFIG } from '@/lib/stripe-config';
import axios from 'axios';

// Assuming you have a Usage component already
import { Usage } from "@/components/parts/usage";
// At the top of the file, add these imports
import type { SubscriptionTier, BillingInterval } from '@/lib/stripe-config';
import { Ban } from 'lucide-react';  // Add missing icon import

// Define the API response type for better type safety
interface BillingApiResponse {
  currentTier: SubscriptionTier;
  usageData: {
    inputTokens: number;
    outputTokens: number;
    agents: number;
    sessions: number;
  };
  subscription: {
    interval: BillingInterval;
    currentPeriodEnd: string;
    status: 'active' | 'past_due' | 'canceled' | 'incomplete';
  };
  billingHistory: Array<{
    date: string;
    amount: string;
    status: 'paid' | 'failed';
    invoiceId: string;
  }>;
  paymentMethod: {
    last4: string;
    expMonth: number;
    expYear: number;
    brand: string;
  } | null;
}

// Type guard to ensure we have valid tier data
function isValidTier(tier: unknown): tier is SubscriptionTier {
  return typeof tier === 'string' && tier in STRIPE_CONFIG.TIERS;
}

// Helper function to safely get tier config
function getTierConfig(tier: SubscriptionTier) {
  const config = STRIPE_CONFIG.TIERS[tier];
  if (!config) {
    throw new Error(`Invalid tier: ${tier}`);
  }
  return config;
}

// Helper function to safely get tier rates
function getTierRates(tier: SubscriptionTier) {
  const rates = STRIPE_CONFIG.METERED.RATES[tier];
  if (!rates) {
    throw new Error(`Invalid tier rates: ${tier}`);
  }
  return rates;
}








// Helper component for usage cards
interface UsageCardProps {
  icon: React.ElementType;
  title: string;
  current?: number;
  limit?: number;
  unlimited?: boolean;
  type?: 'usage' | 'feature';
  feature?: boolean;
  label?: string;
}



function useBillingData() {
  const [data, setData] = useState<BillingApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        console.log('Fetching billing data...');
        const response = await axios.get<BillingApiResponse>('/api/stripe/billing');
        console.log('Billing API Response:', response.data);
        
        // Validate the tier data
        if (!isValidTier(response.data.currentTier)) {
          throw new Error('Invalid tier data received from API');
        }

        console.log('Processed billing data:', {
          currentTier: response.data.currentTier,
          sessions: response.data.usageData.sessions,
          agents: response.data.usageData.agents
        });

        setData(response.data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load billing data';
        console.error('Error fetching billing data:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, []);

  return { data, loading, error };
}

function UsageCard({ icon: Icon, title, current, limit, unlimited, type = 'usage', feature = false, label = '' }: UsageCardProps) {
  
  
  React.useEffect(() => {
    if (title === 'Sessions') {
      console.log('UsageCard Sessions Data:', {
        current,
        limit,
        unlimited
      });
    }
  }, [title, current, limit, unlimited]);
  return (
    <div className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-4 h-4 text-dream-cyan" />
        <span className="text-xs text-neutral-400">{title}</span>
      </div>
      {type === 'usage' ? (
        <div className="mt-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white">{current}</span>
            <span className="text-xs text-neutral-400">
              {unlimited ? 'Unlimited' : `of ${limit}`}
            </span>
          </div>
          {!unlimited && (
            <div className="mt-2 h-1 bg-white/[0.02] rounded-full overflow-hidden">
              <div 
                className="h-full bg-dream-cyan rounded-full transition-all duration-500"
                style={{ width: `${limit ? Math.min((current! / limit) * 100, 100) : 0}%` }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          {feature ? (
            <CheckCircle2 className="w-4 h-4 text-custom-green" />
          ) : (
            <AlertCircle className="w-4 h-4 text-neutral-400" />
          )}
          <span className="text-sm text-white">{label || (feature ? 'Included' : 'Not Available')}</span>
        </div>
      )}
    </div>
  );
}

// Main Billing Page Component
interface BillingPageProps {
  currentTier: SubscriptionTier;
  usageData: {
    inputTokens: number;
    outputTokens: number;
    agents: number;
    sessions: number;
  };
  subscription: {
    interval: BillingInterval;
    currentPeriodEnd: string;
    status: string;
  };
  billingHistory: Array<{
    date: string;
    amount: string;
    status: 'paid' | 'failed';
    invoiceId: string;
  }>;
  paymentMethod: {
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
}

export default function BillingPage() {
  const { data, loading, error } = useBillingData();

    // Add logging when data is received
    React.useEffect(() => {
      if (data) {
        console.log('BillingPage Data:', {
          currentTier: data.currentTier,
          sessions: data.usageData.sessions,
          agents: data.usageData.agents,
          subscription: {
            status: data.subscription.status,
            interval: data.subscription.interval
          }
        });
      }
    }, [data]);

  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-white">Loading billing information...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-red-500">{error || 'Failed to load billing data.'}</p>
      </div>
    );
  }

const { currentTier, usageData, subscription, billingHistory, paymentMethod } = data;
  console.log('Rendering with usage data:', {
    sessions: usageData.sessions,
    agents: usageData.agents,
    tier: currentTier
  });

  const tierConfig = STRIPE_CONFIG.TIERS[currentTier];
  const rates = STRIPE_CONFIG.METERED.RATES[currentTier];

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto p-4">
      {/* Current Plan Overview */}
      <div className="relative group overflow-hidden border border-white/[0.02] rounded-xl bg-neutral-900/50 backdrop-blur-md p-6 transition-all duration-500 shine shadow-dream">
        <div 
          className="absolute inset-0 bg-gradient-to-br from-dream-purple/5 via-dream-cyan/5 to-dream-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
          style={{ filter: "blur(40px)" }} 
        />
        
        <div className="relative space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-dream-cyan" />
              <div>
                <h2 className="text-2xl font-cal text-white">{currentTier} Plan</h2>
                <p className="text-sm text-neutral-400">
                  {subscription.interval === 'YEARLY' ? 'Annual' : 'Monthly'} billing
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 text-xs rounded-full ${subscription.status === 'active' ? 'bg-custom-green/10 text-custom-green' : 'bg-red-500/10 text-red-500'}`}>
                  {subscription.status === 'active' ? 'Active' : 'Inactive'}
                </span>
                <Link 
  href="/settings/upgrade"
  className="px-3 py-1.5 rounded-lg text-sm text-neutral-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
>
  {currentTier === 'GROWTH' ? 'Contact Sales' : 'Upgrade'}
</Link>
              </div>
              <p className="text-sm text-neutral-400 mt-1">
                Next billing date: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Feature Usage Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <UsageCard
              icon={Bot}
              title="Agents"
              current={usageData.agents}
              limit={tierConfig.LIMITS.ONBOARDS}
              unlimited={currentTier !== 'BASIC'}
            />
            <UsageCard
              icon={Users}
              title="Sessions"
              current={usageData.sessions}
              limit={tierConfig.LIMITS.SESSIONS}
              unlimited={currentTier !== 'BASIC'}
            />
            <UsageCard
              icon={Layout}
              title="Custom Domain"
              type="feature"
              feature={currentTier !== 'BASIC'}
              label={currentTier !== 'BASIC' ? 'Included' : 'Not Available'}
            />
            <UsageCard
              icon={Gauge}
              title="Analytics"
              type="feature"
              feature={currentTier === 'GROWTH'}
              label={currentTier === 'PRO' ? 'Basic' : currentTier === 'GROWTH' ? 'Advanced' : 'Limited'}
            />
          </div>

          {/* Token Usage Rates */}
          <div className="border-t border-white/[0.02] pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-cal text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-dream-cyan" />
                Token Usage Rates
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
                <p className="text-sm text-neutral-400">Input Tokens</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-sm text-white">
                    ${rates.INPUT_TOKENS.toFixed(3)}/1K tokens
                  </p>
                  <p className="text-sm text-neutral-400">
                    Used: {(usageData.inputTokens / 1000).toFixed(1)}K
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
                <p className="text-sm text-neutral-400">Output Tokens</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-sm text-white">
                    ${rates.OUTPUT_TOKENS.toFixed(3)}/1K tokens
                  </p>
                  <p className="text-sm text-neutral-400">
                    Used: {(usageData.outputTokens / 1000).toFixed(1)}K
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Graphs Component */}
      <Usage />

      {/* Payment Method Section */}
      <div className="relative group overflow-hidden border border-white/[0.02] rounded-xl bg-neutral-900/50 backdrop-blur-md p-6 transition-all duration-500 shine shadow-dream">
        <div 
          className="absolute inset-0 bg-gradient-to-br from-dream-purple/5 via-dream-cyan/5 to-dream-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
          style={{ filter: "blur(40px)" }} 
        />
        
        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-dream-cyan" />
              <h3 className="text-xl font-cal text-white">Payment Method</h3>
            </div>
            <Link 
  href="/settings/billing/update-payment"
  className="px-3 py-1.5 rounded-lg text-sm text-neutral-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
>
  Update
</Link>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
            <div className="flex-1">
              {paymentMethod ? (
                <>
                  <p className="text-sm text-white">
                    •••• •••• •••• {paymentMethod.last4}
                  </p>
                  <p className="text-xs text-neutral-400">
                    Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
                  </p>
                </>
              ) : (
                <p className="text-sm text-white">No payment method on file.</p>
              )}
            </div>
            {paymentMethod ? (
              <CheckCircle2 className="w-5 h-5 text-custom-green" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
          </div>
        </div>
      </div>

      {/* Billing History Section */}
      <div className="relative group overflow-hidden border border-white/[0.02] rounded-xl bg-neutral-900/50 backdrop-blur-md p-6 transition-all duration-500 shine shadow-dream">
        <div 
          className="absolute inset-0 bg-gradient-to-br from-dream-purple/5 via-dream-cyan/5 to-dream-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
          style={{ filter: "blur(40px)" }} 
        />
        
        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-dream-cyan" />
            <h3 className="text-xl font-cal text-white">Billing History</h3>
          </div>

          <div className="space-y-2">
          {billingHistory.map((invoice, i) => (
  <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-white/[0.02] bg-white/[0.02] group">
    <div className="flex items-center gap-4">
      {invoice.status === "paid" ? (
        <CheckCircle2 className="w-4 h-4 text-custom-green" />
      ) : (
        <AlertCircle className="w-4 h-4 text-red-400" />
      )}
      <div>
        <p className="text-sm text-white">{invoice.date}</p>
        <p className="text-xs text-neutral-400">{invoice.amount}</p>
      </div>
    </div>
    <Link 
      href={`/api/stripe/invoices/${invoice.invoiceId}`}
      className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 rounded-lg text-sm text-neutral-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] flex items-center gap-2"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Download className="w-4 h-4" />
      Invoice
    </Link>
  </div>
))}

          </div>
        </div>
      </div>

      {/* Plan Details */}
      <div className="relative group overflow-hidden border border-white/[0.02] rounded-xl bg-neutral-900/50 backdrop-blur-md p-6 transition-all duration-500 shine shadow-dream">
        <div 
          className="absolute inset-0 bg-gradient-to-br from-dream-purple/5 via-dream-cyan/5 to-dream-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
          style={{ filter: "blur(40px)" }} 
        />
        
        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-dream-cyan" />
              <h3 className="text-xl font-cal text-white">Plan Details</h3>
            </div>
            <span className="px-2.5 py-1 bg-custom-green/10 text-custom-green text-xs rounded-full">
              {currentTier} Plan
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
              <p className="text-sm text-neutral-400 mb-2">Next Payment</p>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-custom-green" />
                <p className="text-sm text-white">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
              <p className="text-sm text-neutral-400 mb-2">Billing Cycle</p>
              <p className="text-sm text-white">{subscription.interval}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.02]">
            <Link
              href="/settings/billing/cancel"
              className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
            >
              <Ban className="w-4 h-4" />
              Cancel Subscription
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
