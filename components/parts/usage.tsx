// components/parts/usage.tsx
'use client';
import { cn } from "@/lib/utils";
import { CircleAlert, ArrowUpRight, Sparkles, Plus } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export const Usage = ({
  totalUsage,
  used,
  plan,
  className
}: {
  totalUsage: number;
  used: number;
  plan: string;
  className?: string;
}) => {
  const calculateDaysLeft = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const timeDiff = nextMonth.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const daysLeft = calculateDaysLeft();
  const remaining = totalUsage - used;
  const usagePercentage = (used / totalUsage) * 100;

  return (
    <div className={cn(
      "relative group overflow-hidden",
      "border border-white/[0.02] rounded-xl",
      "bg-neutral-900/50 backdrop-blur-md",
      "p-6 transition-all duration-500",
      "shine shadow-dream",
      className
    )}>
      {/* Animated gradient background */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-custom-green/5 via-custom-green-light/5 to-custom-green-light/5
          opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ filter: "blur(40px)" }}
      />

      {/* Header */}
      <div className="relative space-y-2 mb-6 pb-6 border-b border-white/[0.02]">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-cal text-white">Usage Overview</h3>
         
        </div>
        <p className="text-sm text-neutral-400">
          Total minutes used out of your current plan limit.
        </p>
      </div>

      {/* Content */}
      <div className="relative space-y-6">
        <div className="space-y-4 p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
          {/* Usage Numbers */}
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-2xl font-medium text-white">
                {used.toLocaleString()} <span className="text-neutral-500">/</span>{" "}
                {totalUsage.toLocaleString()}
              </p>
              <p className="text-sm text-neutral-400">Minutes used</p>
            </div>
            <p className="text-2xl font-medium text-white">{usagePercentage.toFixed(1)}%</p>
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

          {/* Stats */}
          <div className="flex justify-between text-sm">
            <p className="text-neutral-400">
              {remaining.toLocaleString()} minutes remaining
            </p>
            <p className="flex items-center gap-2">
              <CircleAlert className={cn(
                "w-4 h-4",
                usagePercentage > 90 ? "text-red-400" : "text-custom-green-light"
              )} />
              <span className="text-neutral-400">
                Plan resets in{" "}
                <span className="text-white font-medium">{daysLeft}</span>{" "}
                day{daysLeft !== 1 ? "s" : ""}
              </span>
            </p>
          </div>
        </div>

        {/* Upgrade to Pro Section */}
        {plan !== "Upgrade to Pro" && (
          <div className="relative mt-6 rounded-xl border border-custom-green/20 bg-gradient-to-br from-custom-green/10 to-custom-green-light/10 p-4">
            <div className="absolute -top-3 right-4 rounded-full bg-custom-green px-2 py-0.5 text-xs font-medium text-white">
            Upgrade to Pro
            </div>

            <Sparkles className="mb-3 h-6 w-6 text-custom-green-light" />

            <h4 className="mb-1 text-sm font-medium text-white">Upgrade to Pro</h4>
            <p className="mb-3 text-xs text-neutral-400">
              Get access to advanced features and priority support.
            </p>
            <Link
              href="https://router.so/upgrade"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-custom-green px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-custom-green-light"
            >
              <Plus className="h-4 w-4" />
              Upgrade Now
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
