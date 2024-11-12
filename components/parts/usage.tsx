'use client';
import React, { useEffect, useState } from 'react';
import { cn } from "@/lib/utils";
import { 
  CircleAlert, 
  ArrowUpRight, 
  Sparkles, 
  Plus, 
  Clock, 
  DollarSign,
  Calendar,
  Activity,
  MessageSquare
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface UsageData {
  totalMinutes: number;
  totalSeconds: number;
  totalMessages: number;
  sessions: number;
  dailyUsage: Array<{
    date: string;
    seconds: number;
    messages: number;
  }>;
}

interface BillingData {
  totalAmountDue: number;
  currentUsage: number;
  ratePerMinute: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  subscriptionStatus: string;
}

export const Usage = ({
  plan = 'Free',
  limit = 1000,
  className
}: {
  plan?: string;
  limit?: number;
  className?: string;
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [billingData, setBillingData] = useState<BillingData | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usageResponse, billingResponse] = await Promise.all([
        fetch('/api/usage'),
        fetch('/api/stripe/usage')
      ]);
      
      if (!usageResponse.ok || !billingResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const usageJson = await usageResponse.json();
      const billingJson = await billingResponse.json();

      if (usageJson.success && usageJson.usage) {
        setUsageData(usageJson.usage);
      }

      if (billingJson.success && billingJson.usage) {
        setBillingData(billingJson.usage);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const used = usageData?.totalMinutes || 0;
  const usagePercentage = Math.min((used / limit) * 100, 100);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateProjectedCost = () => {
    if (!billingData || !usageData) return 0;
    const ratePerSecond = billingData.ratePerMinute / 60;
    return (usageData.totalSeconds * ratePerSecond / 100).toFixed(2);
  };

  if (loading) {
    return (
      <div className={cn(
        "relative animate-pulse",
        "border border-white/[0.02] rounded-xl",
        "bg-neutral-900/50 backdrop-blur-md",
        "p-6",
        className
      )}>
        <div className="h-24 bg-white/[0.02] rounded-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(
        "relative",
        "border border-red-500/20 rounded-xl",
        "bg-neutral-900/50 backdrop-blur-md",
        "p-6",
        className
      )}>
        <div className="flex items-center gap-2 text-red-400">
          <CircleAlert className="w-4 h-4" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative group overflow-hidden",
      "border border-white/[0.02] rounded-xl",
      "bg-neutral-900/50 backdrop-blur-md",
      "p-6 transition-all duration-500",
      "shine shadow-dream",
      className
    )}>
      {/* Gradient Background */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-custom-green/5 via-custom-green-light/5 to-custom-green-light/5
          opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ filter: "blur(40px)" }}
      />

      {/* Header */}
      <div className="relative space-y-2 mb-6 pb-6 border-b border-white/[0.02]">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-cal text-white">Usage & Billing</h3>
          {billingData?.subscriptionStatus && (
            <span className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              billingData.subscriptionStatus === 'active' 
                ? "bg-custom-green/10 text-custom-green" 
                : "bg-yellow-500/10 text-yellow-400"
            )}>
              {billingData.subscriptionStatus}
            </span>
          )}
        </div>
      </div>

      {/* Billing Overview */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-custom-green" />
            <span className="text-sm text-neutral-400">Current Bill</span>
          </div>
          <p className="text-2xl font-medium text-white">
            ${billingData?.totalAmountDue ? (billingData.totalAmountDue / 100).toFixed(2) : '0.00'}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Projected: ${calculateProjectedCost()}
          </p>
        </div>

        <div className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-custom-green" />
            <span className="text-sm text-neutral-400">Billing Period</span>
          </div>
          {billingData && (
            <p className="text-sm text-white">
              {formatDate(billingData.billingPeriodStart)} - {formatDate(billingData.billingPeriodEnd)}
            </p>
          )}
          <p className="text-xs text-neutral-400 mt-1">
            Rate: ${((billingData?.ratePerMinute || 0) / 100).toFixed(2)}/min
          </p>
        </div>
      </div>

      {/* Usage Progress */}
      <div className="space-y-4 p-4 rounded-lg border border-white/[0.02] bg-white/[0.02] mb-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-2xl font-medium text-white">
              {used.toLocaleString()} <span className="text-neutral-500">min</span>
            </p>
            <p className="text-sm text-neutral-400">Total Usage</p>
          </div>
          <Activity className="w-5 h-5 text-custom-green" />
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 bg-neutral-800 rounded-full overflow-hidden">
          <motion.div
            className={cn(
              "absolute h-full rounded-full",
              "bg-gradient-to-r from-custom-green to-custom-green-light",
              usagePercentage > 90 && "from-red-500 to-orange-500"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${usagePercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.02]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-custom-green" />
              <span className="text-sm text-neutral-400">Time Details</span>
            </div>
            <p className="text-sm text-white">
              {usageData?.totalSeconds.toLocaleString()} seconds
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              {usageData?.sessions} total sessions
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-custom-green" />
              <span className="text-sm text-neutral-400">Messages</span>
            </div>
            <p className="text-sm text-white">
              {usageData?.totalMessages.toLocaleString()} total
            </p>
           
          </div>
        </div>
      </div>

      {/* Usage Chart - You could add a daily usage chart here */}

      {/* Upgrade Section */}
      {plan !== "Pro" && (
        <div className="relative mt-6 rounded-xl border border-custom-green/20 bg-gradient-to-br from-custom-green/10 to-custom-green-light/10 p-4">
          <div className="absolute -top-3 right-4 rounded-full bg-custom-green px-2 py-0.5 text-xs font-medium text-white">
            Pro Features
          </div>
          <Sparkles className="mb-3 h-6 w-6 text-custom-green-light" />
          <h4 className="mb-1 text-sm font-medium text-white">Upgrade to Pro</h4>
          <p className="mb-3 text-xs text-neutral-400">
            Get higher usage limits and detailed analytics
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