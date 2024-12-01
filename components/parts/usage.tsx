"use client"
import React, { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Loader2, CircleAlert, MessageSquare, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SubscriptionTier } from "@/lib/stripe-config";

interface UsageData {
  tokens: {
    input: {
      total: number;
      ratePerThousand: number;
    };
    output: {
      total: number;
      ratePerThousand: number;
    };
  };
  sessions: {
    total: number;
  };
  subscription: {
    status: string;
    tier: SubscriptionTier;
  };
}

interface UsageProps {
  className?: string;
  initialTier?: SubscriptionTier;
}

export function Usage({ className, initialTier = 'BASIC' }: UsageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UsageData | null>(null);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>(initialTier);

  // Debug log for initial props
  console.log('Usage Component Props:', { initialTier, className });
  console.log('Current active tier:', currentTier);

  const tierConfig = useMemo(() => {
    console.log('Calculating tierConfig for:', currentTier);
    
    const config = (() => {
      switch (currentTier) {
        case 'BASIC':
          return {
            sessionLimit: 50,
            isUnlimited: false,
            badge: null,
            inputTokenLimit: 100_000,
            outputTokenLimit: 50_000
          };
        case 'PRO':
          return {
            sessionLimit: null,
            isUnlimited: true,
            badge: 'Unlimited',
            inputTokenLimit: 500_000,
            outputTokenLimit: 250_000
          };
        case 'GROWTH':
          return {
            sessionLimit: null,
            isUnlimited: true,
            badge: 'Unlimited',
            inputTokenLimit: 2_000_000,
            outputTokenLimit: 1_000_000
          };
        default:
          console.warn('Unknown tier:', currentTier);
          return {
            sessionLimit: 50,
            isUnlimited: false,
            badge: null,
            inputTokenLimit: 100_000,
            outputTokenLimit: 50_000
          };
      }
    })();

    console.log('Calculated tierConfig:', config);
    return config;
  }, [currentTier]);

  // Fetch current tier data
  useEffect(() => {
    async function fetchTierData() {
      try {
        const response = await fetch('/api/stripe/billing');
        if (!response.ok) throw new Error('Failed to fetch subscription data');
        const data = await response.json();
        console.log('Fetched tier data:', data);
        setCurrentTier(data.currentTier);
      } catch (err) {
        console.error('Error fetching tier data:', err);
      }
    }

    fetchTierData();
  }, []);

  // Fetch usage data
  useEffect(() => {
    async function fetchData() {
      console.log('Fetching usage data for tier:', currentTier);
      try {
        const response = await fetch("/api/stripe/usage");
        console.log('API Response status:', response.status);
        
        if (!response.ok) throw new Error("Failed to fetch usage data");
        
        const rawData = await response.json();
        console.log('Raw API Response:', rawData);
        
        const formattedData: UsageData = {
          tokens: {
            input: {
              total: rawData.usage?.input_tokens?.total || 0,
              ratePerThousand: rawData.usage?.input_tokens?.ratePerThousand || 0,
            },
            output: {
              total: rawData.usage?.output_tokens?.total || 0,
              ratePerThousand: rawData.usage?.output_tokens?.ratePerThousand || 0,
            },
          },
          sessions: {
            total: rawData.usage?.sessions?.total || 0,
          },
          subscription: {
            status: rawData.usage?.subscription?.status || "inactive",
            tier: currentTier,
          },
        };

        console.log('Formatted Data:', formattedData);
        setData(formattedData);
      } catch (err) {
        console.error('Error fetching usage data:', err);
        setError(err instanceof Error ? err.message : "Failed to load usage data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [currentTier]);

  // Log state changes
  useEffect(() => {
    console.log('Component State:', { loading, error, data, currentTier });
  }, [loading, error, data, currentTier]);

  if (loading) {
    console.log('Rendering loading state');
    return (
      <div className={cn(
        "flex items-center justify-center p-8",
        "border border-white/[0.02] rounded-xl",
        "bg-neutral-900/50 backdrop-blur-md",
        className
      )}>
        <Loader2 className="w-6 h-6 animate-spin text-dream-cyan" />
      </div>
    );
  }

  if (error) {
    console.log('Rendering error state:', error);
    return (
      <div className={cn(
        "p-6 border border-red-500/20 rounded-xl",
        "bg-neutral-900/50 backdrop-blur-md",
        className
      )}>
        <div className="flex items-center gap-2 text-red-400">
          <CircleAlert className="w-4 h-4" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    console.log('No data available');
    return null;
  }

  const totalTokens = data.tokens.input.total + data.tokens.output.total;
  const sessionPercentage = tierConfig.sessionLimit 
    ? Math.min((data.sessions.total / tierConfig.sessionLimit) * 100, 100)
    : 100;

  console.log('Calculated Values:', { 
    totalTokens, 
    sessionPercentage,
    isUnlimited: tierConfig.isUnlimited,
    sessionLimit: tierConfig.sessionLimit,
    currentTier
  });

  return (
    <div className={cn(
      "relative group overflow-hidden rounded-xl border border-white/[0.02] bg-neutral-900/50 backdrop-blur-md",
      className
    )}>
      {/* Token Usage Section */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-dream-cyan" />
          <h3 className="text-lg font-medium text-white">Usage-Based Pricing</h3>
        </div>

        <div className="flex flex-col space-y-4">
          <div>
            <p className="text-3xl font-semibold text-white">
              {totalTokens.toLocaleString()}
            </p>
            <p className="text-sm text-neutral-400">Total Tokens Used</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-white/[0.02]">
              <p className="text-sm text-neutral-400 mb-1">Input Tokens</p>
              <p className="text-sm font-medium text-white">
                {data.tokens.input.total.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-400">
                ${data.tokens.input.ratePerThousand.toFixed(3)}/1K tokens
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02]">
              <p className="text-sm text-neutral-400 mb-1">Output Tokens</p>
              <p className="text-sm font-medium text-white">
                {data.tokens.output.total.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-400">
                ${data.tokens.output.ratePerThousand.toFixed(3)}/1K tokens
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Session Usage Section */}
      <div className="border-t border-white/[0.02] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-dream-cyan" />
            <h3 className="text-lg font-medium text-white">Monthly Sessions</h3>
          </div>
          {tierConfig.isUnlimited && (
            <Badge variant="secondary" className="bg-dream-cyan/10 text-dream-cyan">
              {tierConfig.badge}
            </Badge>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-baseline">
            <p className="text-3xl font-semibold text-white">
              {data.sessions.total.toLocaleString()}
            </p>
            {tierConfig.isUnlimited ? (
              <p className="text-sm text-neutral-400">Unlimited Access</p>
            ) : (
              <p className="text-sm text-neutral-400">
                of {tierConfig.sessionLimit} sessions
              </p>
            )}
          </div>

          {!tierConfig.isUnlimited && (
            <div>
              <div className="h-2 bg-white/[0.02] rounded-full overflow-hidden">
                <div
                  className="h-full bg-dream-cyan rounded-full transition-all duration-500"
                  style={{ width: `${sessionPercentage}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-neutral-400">
                {tierConfig.sessionLimit! - data.sessions.total} sessions remaining this month
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Usage;