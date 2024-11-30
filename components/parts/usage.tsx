"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CircleAlert,
  MessageSquare,
  Users,
  Sparkles,
} from "lucide-react";

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
    limit: number | null;
    isUnlimited: boolean;
  };
  subscription: {
    tier: "BASIC" | "PRO" | "GROWTH";
    status: string;
  };
}

interface UsageProps {
  className?: string;
  plan?: string;  // Add the plan prop
}




export function Usage({ className, plan }: UsageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UsageData | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/stripe/usage");
        if (!response.ok) throw new Error("Failed to fetch usage data");
        const rawData = await response.json();

        setData({
          tokens: {
            input: {
              total: rawData.usage.input_tokens.total || 0,
              ratePerThousand: rawData.usage.input_tokens.ratePerThousand || 0,
            },
            output: {
              total: rawData.usage.output_tokens.total || 0,
              ratePerThousand: rawData.usage.output_tokens.ratePerThousand || 0,
            },
          },
          sessions: {
            total: rawData.usage.sessions?.total || 0,
            limit: rawData.usage.subscription?.tier === "BASIC" ? 50 : null,
            isUnlimited: rawData.usage.subscription?.tier !== "BASIC",
          },
          subscription: {
            tier: plan?.toUpperCase() as "BASIC" | "PRO" | "GROWTH" || rawData.usage.subscription?.tier || "BASIC",
            status: rawData.usage.subscription?.status || "inactive",
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load usage data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [plan]); // Add plan to dependency array


  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center p-8",
          "border border-white/[0.02] rounded-xl",
          "bg-neutral-900/50 backdrop-blur-md",
          className
        )}
      >
        <Loader2 className="w-6 h-6 animate-spin text-dream-cyan" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "p-6 border border-red-500/20 rounded-xl",
          "bg-neutral-900/50 backdrop-blur-md",
          className
        )}
      >
        <div className="flex items-center gap-2 text-red-400">
          <CircleAlert className="w-4 h-4" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalTokens = data.tokens.input.total + data.tokens.output.total;
  const sessionPercentage =
    data.sessions.limit !== null
      ? Math.min((data.sessions.total / data.sessions.limit) * 100, 100)
      : 100;

  return (
    <div
      className={cn(
        "relative group overflow-hidden rounded-xl border border-white/[0.02] bg-neutral-900/50 backdrop-blur-md",
        className
      )}
    >
      {/* Background Gradient Effect */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-dream-purple/5 via-dream-cyan/5 to-dream-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ filter: "blur(40px)" }}
      />

      <div className="relative">
        {/* Token Usage Section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-dream-cyan" />
              <h3 className="text-lg font-medium text-white">
                Usage-Based Pricing
              </h3>
            </div>
            <span className="px-2.5 py-1 text-xs rounded-full bg-dream-cyan/10 text-dream-cyan">
              Pay as you go
            </span>
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

        {/* Divider */}
        <div className="border-t border-white/[0.02]" />

        {/* Session Usage Section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-dream-cyan" />
              <h3 className="text-lg font-medium text-white">
                Monthly Sessions
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs rounded-full bg-dream-cyan/10 text-dream-cyan">
                {data.subscription.tier} Plan
              </span>
              {data.sessions.isUnlimited && (
                <Sparkles className="w-4 h-4 text-dream-cyan" />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-baseline">
              <p className="text-3xl font-semibold text-white">
                {data.sessions.total.toLocaleString()}
              </p>
              <p className="text-sm text-neutral-400">
                {data.sessions.isUnlimited
                  ? "Unlimited Access"
                  : `of ${data.sessions.limit} sessions`}
              </p>
            </div>

            {!data.sessions.isUnlimited && (
              <div>
                <div className="h-2 bg-white/[0.02] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-dream-cyan rounded-full transition-all duration-500"
                    style={{ width: `${sessionPercentage}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-neutral-400">
                  {data.sessions.limit! - data.sessions.total} sessions remaining
                  this month
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Usage;
