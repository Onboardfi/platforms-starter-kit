// components/parts/usage.tsx
'use client';
import { cn } from "@/lib/utils";
import { CircleAlert, ArrowUpRight, Sparkles } from "lucide-react";
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
        className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 
          opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ filter: "blur(40px)" }}
      />

      {/* Header */}
      <div className="relative space-y-2 mb-6 pb-6 border-b border-white/[0.02]">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-cal text-white">Usage Overview</h3>
          <div 
            className={cn(
              "px-3 py-1 rounded-full text-sm font-medium",
              "border border-white/[0.05] bg-white/[0.02]",
              "flex items-center gap-2",
              plan === "Pro" && "bg-indigo-500/20 border-indigo-500/30 text-indigo-400",
              "transition-all duration-300"
            )}
          >
            {plan === "Pro" && <Sparkles className="w-4 h-4" />}
            {plan}
          </div>
        </div>
        <p className="text-sm text-neutral-400">
          Total onboards captured out of your current plan limit.
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
              <p className="text-sm text-neutral-400">Onboards created</p>
            </div>
            <p className="text-2xl font-medium text-white">{usagePercentage.toFixed(1)}%</p>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 bg-neutral-800 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "absolute h-full rounded-full",
                "bg-gradient-to-r from-indigo-500 to-purple-500",
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
              {remaining.toLocaleString()} Onboards remaining
            </p>
            <p className="flex items-center gap-2">
              <CircleAlert className={cn(
                "w-4 h-4",
                usagePercentage > 90 ? "text-red-400" : "text-green-400"
              )} />
              <span className="text-neutral-400">
                Plan resets in{" "}
                <span className="text-white font-medium">{daysLeft}</span>{" "}
                day{daysLeft !== 1 ? "s" : ""}
              </span>
            </p>
          </div>
        </div>

        {/* Upgrade Button */}
        {plan === "Free" && (
          <Link
            href="https://router.so/upgrade"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group/btn flex flex-col gap-2 w-full",
              "p-4 rounded-lg",
              "border border-indigo-500/30 bg-indigo-500/10",
              "hover:bg-indigo-500/20 hover:border-indigo-500/40",
              "transition-all duration-300"
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-indigo-400 font-medium">Upgrade Plan</p>
              <ArrowUpRight className="w-4 h-4 text-indigo-400 
                transition-transform duration-300 
                group-hover/btn:translate-x-0.5 
                group-hover/btn:-translate-y-0.5" 
              />
            </div>
            <p className="text-sm text-neutral-400">
              Upgrade your plan to capture more leads
            </p>
          </Link>
        )}
      </div>
    </div>
  );
};