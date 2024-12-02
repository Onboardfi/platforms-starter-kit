//Users/bobbygilbert/Documents/Github/platforms-starter-kit/components/UpgradeCTA.tsx


import { Sparkles, Plus, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { SubscriptionTier } from "@/lib/stripe-config";
import { cn } from "@/lib/utils";
import { analyticsClient, ANALYTICS_EVENTS } from "@/lib/analytics";

interface UpgradeCTAProps {
  currentTier: SubscriptionTier;
  isCollapsed: boolean;
}

const TIER_CONTENT = {
  BASIC: {
    badge: 'Pro',
    title: 'Upgrade to Pro',
    description: 'Get access to advanced features and priority support.',
    buttonText: 'Upgrade to Pro',
    targetTier: 'PRO' as const,
    isBasic: true,
    features: [
      'Unlimited agents',
      'Priority support',
      'Advanced analytics'
    ]
  },
  PRO: {
    badge: 'Growth',
    title: 'Upgrade to Growth',
    description: 'Scale your business with our most powerful features.',
    buttonText: 'Upgrade to Growth',
    targetTier: 'GROWTH' as const,
    isBasic: false,
    features: [
      'Enterprise support',
      'Custom integrations',
      'Advanced security'
    ]
  }
} as const;

export function UpgradeCTA({ currentTier, isCollapsed }: UpgradeCTAProps) {
  const router = useRouter();

  const upgradeContent = useMemo(() => {
    if (!(currentTier in TIER_CONTENT)) {
      return null;
    }
    return TIER_CONTENT[currentTier as keyof typeof TIER_CONTENT];
  }, [currentTier]);

  const handleUpgradeClick = () => {
    if (!upgradeContent?.targetTier) return;

    // Track the upgrade click using analyticsClient
    analyticsClient.track(ANALYTICS_EVENTS.BILLING.UPGRADE_CLICKED, {
      currentTier,
      targetTier: upgradeContent.targetTier,
      source: 'sidebar_cta',
      location: typeof window !== 'undefined' ? window.location.pathname : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer || 'direct' : undefined,
      viewportWidth: typeof window !== 'undefined' ? window.innerWidth : undefined,
      deviceType: typeof window !== 'undefined' ? (window.innerWidth < 768 ? 'mobile' : 'desktop') : undefined,
      timestamp: new Date().toISOString()
    });

    router.push('/settings/upgrade');
  };

  if (!upgradeContent || isCollapsed) {
    return null;
  }

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
      {/* Tier Badge */}
      <div className={cn(
        "absolute -top-3 right-4",
        "rounded-full px-2 py-0.5",
        "text-xs font-medium text-black",
        "bg-dream-cyan"
      )}>
        {upgradeContent.badge}
      </div>

      {/* Icon */}
      <Sparkles 
        className={cn(
          "mb-3 h-6 w-6",
          upgradeContent.isBasic 
            ? "text-custom-green-light" 
            : "text-dream-cyan-light"
        )} 
      />

      {/* Content */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-white">
          {upgradeContent.title}
        </h4>
        <p className="text-xs text-neutral-400">
          {upgradeContent.description}
        </p>

        {/* Features List */}
        <ul className="space-y-1">
          {upgradeContent.features.map((feature, index) => (
            <li 
              key={index}
              className="flex items-center text-xs text-neutral-400"
            >
              <Plus className="mr-1.5 h-3 w-3" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Upgrade Button */}
      <button 
        onClick={handleUpgradeClick}
        className={cn(
          "mt-4 w-full",
          "flex items-center justify-center gap-2",
          "rounded-lg px-3 py-2",
          "text-xs font-medium text-black",
          "transition-all duration-200",
          upgradeContent.isBasic ? [
            "bg-dream-cyan",
            "hover:bg-custom-green-light",
            "active:bg-custom-green-light/90",
          ] : [
            "bg-dream-cyan",
            "hover:bg-dream-cyan-light",
            "active:bg-dream-cyan-light/90",
          ],
          "focus:outline-none focus:ring-2",
          "focus:ring-offset-1 focus:ring-offset-transparent",
          upgradeContent.isBasic 
            ? "focus:ring-custom-green/50"
            : "focus:ring-dream-cyan/50"
        )}
      >
        <Plus className="h-4 w-4" />
        <span>{upgradeContent.buttonText}</span>
        <ArrowUpRight className="h-4 w-4" />
      </button>
    </div>
  );
}