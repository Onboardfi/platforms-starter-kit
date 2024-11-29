// lib/stripe-config.ts

/**
 * Comprehensive Stripe configuration that combines both metered usage
 * and tiered subscription pricing.
 */
export const STRIPE_CONFIG = {
  // Base subscription tiers
  TIERS: {
    BASIC: {
      PRODUCT_ID: 'prod_RFMgVqh0glkO2H',
      MONTHLY: 'price_1QMrwiAvXC0YI9f3FgxX7ihs',
      // Added YEARLY for consistency, even if it's the same as MONTHLY
      YEARLY: 'price_1QMrwiAvXC0YI9f3FgxX7ihs', // Adjust if you have a yearly price
      LIMITS: {
        INPUT_TOKENS: 100_000,
        OUTPUT_TOKENS: 50_000,
        ONBOARDS: 5,
        SESSIONS: 50,
        INTEGRATIONS: 2,
      },
      FEATURES: {
        CUSTOM_DOMAIN: false,
        ADVANCED_ANALYTICS: false,
        TEAM_COLLABORATION: false,
      },
    },
    PRO: {
      PRODUCT_ID: 'prod_RFMioA3QdK7PHo',
      MONTHLY: 'price_1QMryfAvXC0YI9f3Kequ91gy',
      YEARLY: 'price_1QMryfAvXC0YI9f3QW9Ogpa2',
      LIMITS: {
        INPUT_TOKENS: 500_000,
        OUTPUT_TOKENS: 250_000,
        ONBOARDS: -1,
        SESSIONS: -1,
        INTEGRATIONS: -1,
      },
      FEATURES: {
        CUSTOM_DOMAIN: true,
        ADVANCED_ANALYTICS: false,
        TEAM_COLLABORATION: true,
      },
    },
    GROWTH: {
      PRODUCT_ID: 'prod_RFMjZlKS8OLr14',
      MONTHLY: 'price_1QMrzbAvXC0YI9f34FTgFp6W',
      YEARLY: 'price_1QMrzbAvXC0YI9f3MwK1tZqC',
      LIMITS: {
        INPUT_TOKENS: 2_000_000,
        OUTPUT_TOKENS: 1_000_000,
        ONBOARDS: -1,
        SESSIONS: -1,
        INTEGRATIONS: -1,
      },
      FEATURES: {
        CUSTOM_DOMAIN: true,
        ADVANCED_ANALYTICS: true,
        TEAM_COLLABORATION: true,
      },
    },
  },

  // Metered pricing configuration
  METERED: {
    INPUT_TOKENS_PRICE_ID: process.env.STRIPE_INPUT_TOKENS_PRICE_ID!,
    OUTPUT_TOKENS_PRICE_ID: process.env.STRIPE_OUTPUT_TOKENS_PRICE_ID!,

    RATES: {
      BASIC: {
        INPUT_TOKENS: 1.5,
        OUTPUT_TOKENS: 2.0,
      },
      PRO: {
        INPUT_TOKENS: 1.2,
        OUTPUT_TOKENS: 1.6,
      },
      GROWTH: {
        INPUT_TOKENS: 1.0,
        OUTPUT_TOKENS: 1.4,
      },
    },
  },

  SETTINGS: {
    ANNUAL_DISCOUNT_PERCENTAGE: 20,
    DEFAULT_TIER: 'BASIC' as const,
    USAGE_AGGREGATION: 'monthly' as const,
    TRIAL_DAYS: 14,
    GRACE_PERIOD_DAYS: 3,
  },
} as const;

// Define more precise types that reflect our tier structure
type BasicTier = typeof STRIPE_CONFIG.TIERS.BASIC;
type PaidTier = typeof STRIPE_CONFIG.TIERS.PRO | typeof STRIPE_CONFIG.TIERS.GROWTH;
export type SubscriptionTier = keyof typeof STRIPE_CONFIG.TIERS;
export type BillingInterval = 'MONTHLY' | 'YEARLY';

export interface TierLimits {
  INPUT_TOKENS: number;
  OUTPUT_TOKENS: number;
  ONBOARDS: number;
  SESSIONS: number;
  INTEGRATIONS: number;
}

export interface MeteredRates {
  INPUT_TOKENS: number;
  OUTPUT_TOKENS: number;
}

// Helper function to check if a tier has yearly billing
function isPaidTier(tier: typeof STRIPE_CONFIG.TIERS[SubscriptionTier]): tier is PaidTier {
  return 'YEARLY' in tier;
}

/**
 * Gets the appropriate price ID for a given tier and billing interval.
 */
export const getPriceId = (tier: SubscriptionTier, interval: BillingInterval): string => {
  const tierConfig = STRIPE_CONFIG.TIERS[tier];

  // For tiers without yearly billing, default to monthly
  if (!isPaidTier(tierConfig) || interval === 'MONTHLY') {
    return tierConfig.MONTHLY;
  }

  // For paid tiers with yearly billing
  return tierConfig.YEARLY;
};

export const getTokenLimits = (tier: SubscriptionTier): { input: number; output: number } => {
  return {
    input: STRIPE_CONFIG.TIERS[tier].LIMITS.INPUT_TOKENS,
    output: STRIPE_CONFIG.TIERS[tier].LIMITS.OUTPUT_TOKENS,
  };
};

export const getMeteredRates = (tier: SubscriptionTier): MeteredRates => {
  return STRIPE_CONFIG.METERED.RATES[tier];
};

export const calculateAnnualPrice = (monthlyPrice: number): number => {
  const discount = 1 - STRIPE_CONFIG.SETTINGS.ANNUAL_DISCOUNT_PERCENTAGE / 100;
  return Math.floor(monthlyPrice * 12 * discount);
};
