import type { SubscriptionTier, BillingInterval } from '@/lib/stripe-config';

export interface BillingApiResponse {
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

export interface BillingPageProps extends BillingApiResponse {}

export interface UsageData {
  inputTokens: {
    total: number;
    summaries: Array<{
      timestamp: number;
      aggregated_value: number;
    }>;
    ratePerThousand: number;
  };
  outputTokens: {
    total: number;
    summaries: Array<{
      timestamp: number;
      aggregated_value: number;
    }>;
    ratePerThousand: number;
  };
  subscription: {
    status: string;
    current_period_start: string;
    current_period_end: string;
  };
  invoice: {
    amount_due: number;
    estimated_total: number;
  };
}

export type UsagePeriod = 'daily' | 'weekly' | 'monthly';