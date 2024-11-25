///Users/bobbygilbert/Documents/Github/platforms-starter-kit/components/parts/usage.tsx


"use client"

import React, { useEffect, useState } from 'react';
import { cn } from "@/lib/utils";
import { 
  CircleAlert, 
  ArrowUpRight, 
  Sparkles, 
  Plus, 
  Coins,
  DollarSign,
  Calendar,
  BarChart3,
  MessageSquare,
  Loader2
} from "lucide-react";
import Link from "next/link";

interface MeterEventSummary {
  id: string;
  aggregated_value: number;
  start_time: number;
  end_time: number;
  meter: string;
}

interface BillingData {
  inputTokens: {
    total: number;
    summaries: MeterEventSummary[];
    ratePerThousand: number;
  };
  outputTokens: {
    total: number;
    summaries: MeterEventSummary[];
    ratePerThousand: number;
  };
  subscription: {
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
  };
  invoice: {
    amountDue: number;
    estimatedTotal: number;
  };
}

export const Usage = ({
  plan = 'Free',
  className
}: {
  plan?: string;
  className?: string;
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billingData, setBillingData] = useState<BillingData | null>(null);

  const fetchData = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      // Get meter summaries and subscription data
      const response = await fetch('/api/stripe/usage');
      if (!response.ok) {
        throw new Error('Failed to fetch billing data');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setBillingData({
        inputTokens: {
          total: data.usage.input_tokens.total || 0,
          summaries: data.usage.input_tokens.summaries || [],
          ratePerThousand: data.usage.input_tokens.ratePerThousand || 0.015
        },
        outputTokens: {
          total: data.usage.output_tokens.total || 0,
          summaries: data.usage.output_tokens.summaries || [],
          ratePerThousand: data.usage.output_tokens.ratePerThousand || 0.020
        },
        subscription: {
          status: data.usage.subscription?.status || 'inactive',
          currentPeriodStart: data.usage.subscription?.current_period_start || new Date().toISOString(),
          currentPeriodEnd: data.usage.subscription?.current_period_end || new Date().toISOString()
        },
        invoice: {
          amountDue: data.usage.invoice?.amount_due || 0,
          estimatedTotal: data.usage.invoice?.estimated_total || 0
        }
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching billing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(1)}M`;
    }
    if (tokens >= 1_000) {
      return `${(tokens / 1_000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const calculateEstimatedCost = (inputTokens: number, outputTokens: number) => {
    if (!billingData) return 0;
    
    const inputCost = (inputTokens / 1000) * billingData.inputTokens.ratePerThousand;
    const outputCost = (outputTokens / 1000) * billingData.outputTokens.ratePerThousand;
    
    return inputCost + outputCost;
  };

  if (loading) {
    return (
      <div className={cn(
        "relative border border-white/[0.02] rounded-xl",
        "bg-neutral-900/50 backdrop-blur-md p-6",
        className
      )}>
        <Loader2 className="w-6 h-6 animate-spin text-custom-green mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(
        "relative border border-red-500/20 rounded-xl",
        "bg-neutral-900/50 backdrop-blur-md p-6",
        className
      )}>
        <div className="flex items-center gap-2 text-red-400">
          <CircleAlert className="w-4 h-4" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!billingData) return null;

  const totalTokens = billingData.inputTokens.total + billingData.outputTokens.total;
  const estimatedCost = calculateEstimatedCost(
    billingData.inputTokens.total,
    billingData.outputTokens.total
  );

  return (
    <div className={cn(
      "relative group overflow-hidden",
      "border border-white/[0.02] rounded-xl",
      "bg-neutral-900/50 backdrop-blur-md",
      "p-6 transition-all duration-500",
      "shine shadow-dream",
      className
    )}>
      <div 
        className="absolute inset-0 bg-gradient-to-br from-custom-green/5 via-custom-green-light/5 to-custom-green-light/5
          opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ filter: "blur(40px)" }}
      />

      <div className="relative space-y-2 mb-6 pb-6 border-b border-white/[0.02]">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-cal text-white">Usage & Billing</h3>
          <div className="flex items-center gap-2">
            {refreshing && (
              <Loader2 className="w-4 h-4 animate-spin text-custom-green" />
            )}
            <span className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              billingData.subscription.status === 'active' 
                ? "bg-custom-green/10 text-custom-green" 
                : "bg-yellow-500/10 text-yellow-400"
            )}>
              {billingData.subscription.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-custom-green" />
            <span className="text-sm text-neutral-400">Current Bill</span>
          </div>
          <p className="text-2xl font-medium text-white">
            ${(billingData.invoice.amountDue / 100).toFixed(2)}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Estimate: ${estimatedCost.toFixed(2)}
          </p>
        </div>

        <div className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-custom-green" />
            <span className="text-sm text-neutral-400">Billing Period</span>
          </div>
          <p className="text-sm text-white">
            {formatDate(billingData.subscription.currentPeriodStart)} - 
            {formatDate(billingData.subscription.currentPeriodEnd)}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Auto-renews monthly
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4 rounded-lg border border-white/[0.02] bg-white/[0.02] mb-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-2xl font-medium text-white">
              {formatTokens(totalTokens)} <span className="text-neutral-500">tokens</span>
            </p>
            <p className="text-sm text-neutral-400">Total Usage</p>
          </div>
          <Coins className="w-5 h-5 text-custom-green" />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.02]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-custom-green" />
              <span className="text-sm text-neutral-400">Input Tokens</span>
            </div>
            <p className="text-sm text-white">
              {formatTokens(billingData.inputTokens.total)}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              ${billingData.inputTokens.ratePerThousand.toFixed(3)}/1K tokens
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-custom-green" />
              <span className="text-sm text-neutral-400">Output Tokens</span>
            </div>
            <p className="text-sm text-white">
              {formatTokens(billingData.outputTokens.total)}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              ${billingData.outputTokens.ratePerThousand.toFixed(3)}/1K tokens
            </p>
          </div>
        </div>
      </div>

      {plan !== "Pro" && (
        <div className="relative mt-6 rounded-xl border border-custom-green/20 bg-gradient-to-br from-custom-green/10 to-custom-green-light/10 p-4">
          <div className="absolute -top-3 right-4 rounded-full bg-custom-green px-2 py-0.5 text-xs font-medium text-white">
            Pro Features
          </div>
          <Sparkles className="mb-3 h-6 w-6 text-custom-green-light" />
          <h4 className="mb-1 text-sm font-medium text-white">Upgrade to Pro</h4>
          <p className="mb-3 text-xs text-neutral-400">
            Get volume discounts and advanced analytics
          </p>
          <Link
            href="/upgrade"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-custom-green px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-custom-green-light"
          >
            <Plus className="h-4 w-4" />
            Upgrade Now
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default Usage;