import { Sparkles, Plus, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { SubscriptionTier } from "@/lib/stripe-config";
import { cn } from "@/lib/utils";

interface UpgradeCTAProps {
  currentTier: SubscriptionTier;
  isCollapsed: boolean;
}

export function UpgradeCTA({ currentTier, isCollapsed }: UpgradeCTAProps) {
  const router = useRouter();

  const upgradeContent = useMemo(() => {
    switch (currentTier) {
      case 'BASIC':
        return {
          badge: 'Pro',
          title: 'Upgrade to Pro',
          description: 'Get access to advanced features and priority support.',
          buttonText: 'Upgrade to Pro',
          isBasic: true
        };
      case 'PRO':
        return {
          badge: 'Growth',
          title: 'Upgrade to Growth',
          description: 'Scale your business with our most powerful features.',
          buttonText: 'Upgrade to Growth',
          isBasic: false
        };
      default:
        return null;
    }
  }, [currentTier]);

  if (!upgradeContent || isCollapsed) return null;

  return (
    <div className={cn(
      "relative rounded-xl border p-4 w-full",
      "bg-gradient-to-br",
      upgradeContent.isBasic ? [
        "border-custom-green/20",
        "from-custom-green/10 to-custom-green-light/10"
      ] : [
        "border-dream-cyan/20",
        "from-dream-cyan/10 to-dream-cyan-light/10"
      ]
    )}>
      <div className={cn(
        "absolute -top-3 right-4 rounded-full px-2 py-0.5 text-xs font-medium text-black",
        upgradeContent.isBasic ? "bg-dream-cyan" : "bg-dream-cyan"
      )}>
        {upgradeContent.badge}
      </div>

      <Sparkles className={cn(
        "mb-3 h-6 w-6",
        upgradeContent.isBasic ? "text-custom-green-light" : "text-dream-cyan-light"
      )} />

      <h4 className="mb-1 text-sm font-medium text-white">
        {upgradeContent.title}
      </h4>
      <p className="mb-3 text-xs text-neutral-400">
        {upgradeContent.description}
      </p>
      <button 
        onClick={() => router.push('/settings/upgrade')}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2",
          "text-xs font-medium text-black transition-colors",
          upgradeContent.isBasic ? [
            "bg-dream-cyan",
            "hover:bg-custom-green-light",
          ] : [
            "bg-dream-cyan",
            "hover:bg-dream-cyan-light",
          ]
        )}
      >
        <Plus className="h-4 w-4" />
        {upgradeContent.buttonText}
        <ArrowUpRight className="h-4 w-4" />
      </button>
    </div>
  );
}