//Users/bobbygilbert/Documents/Github/platforms-starter-kit/lib/analytics/index.ts

import { Analytics } from '@segment/analytics-node';
import { SelectOrganization, SelectOnboardingSession, SelectAgent } from '@/lib/schema';
import type { SubscriptionTier } from "@/lib/stripe-config";

// Initialize server-side analytics
export const analytics = new Analytics({
  writeKey: process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY || '',
});


export type UserTraits = {
    email?: string;
    name?: string;
    createdAt?: string;
    organizationId?: string;
    organizationName?: string;
    role?: string;
    lastLogin?: string;
    [key: string]: any;
  };
  
  export type OrganizationTraits = {
    name: string;
    tier?: string;
    createdAt?: string;
    memberCount?: number;
    industry?: string;
    [key: string]: any;
  };
type BillingEventProperties = {
  currentTier: SubscriptionTier;
  targetTier?: SubscriptionTier;
  source?: string;
  location?: string;
  referrer?: string;
  viewportWidth?: number;
  deviceType?: 'mobile' | 'desktop';
  amount?: number;
  currency?: string;
  billingInterval?: 'monthly' | 'yearly';
  status?: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  [key: string]: any;
};

// Analytics Events
export const ANALYTICS_EVENTS = {
    AUTH: {
      LOGIN_CLICKED: 'Login Button Clicked',
      SIGNUP_CLICKED: 'Signup Button Clicked',
      LOGIN_SUCCEEDED: 'Login Succeeded',
      LOGIN_FAILED: 'Login Failed'
    },
    ORGANIZATION: {
      CREATED: 'Organization Created',
      UPDATED: 'Organization Updated',
      MEMBER_INVITED: 'Organization Member Invited',
      MEMBER_JOINED: 'Organization Member Joined'
    },
    ONBOARDING: {
      SESSION_STARTED: 'Onboarding Session Started',
      SESSION_COMPLETED: 'Onboarding Session Completed',
      STEP_COMPLETED: 'Onboarding Step Completed'
    },
    FEATURE: {
      AGENT_CREATED: 'Agent Created',
      AGENT_UPDATED: 'Agent Updated',
      AGENT_DELETED: 'Agent Deleted',
      AGENT_CREATION_STARTED: 'Agent Creation Started',
      AGENT_CREATION_FAILED: 'Agent Creation Failed'
    },
    BILLING: {
      UPGRADE_CLICKED: 'Upgrade Button Clicked',
      UPGRADE_PAGE_VIEWED: 'Upgrade Page Viewed',
      CHECKOUT_STARTED: 'Checkout Started',
      CHECKOUT_COMPLETED: 'Checkout Completed',
      CHECKOUT_FAILED: 'Checkout Failed',
      PLAN_CHANGED: 'Plan Changed'
    }
  } as const;



// Client-side analytics helper
export const analyticsClient = {
  identify: (userId: string, traits: UserTraits = {}) => {
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.identify(userId, {
        ...traits,
        updatedAt: new Date().toISOString(),
      });
    }
  },

  group: (organizationId: string, traits: OrganizationTraits) => {
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.group(organizationId, {
        ...traits,
        updatedAt: new Date().toISOString(),
      });
    }
  },

  page: (name: string, properties: Record<string, any> = {}) => {
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.page(name, {
        ...properties,
        timestamp: new Date().toISOString(),
      });
    }
  },

  track: (event: string, properties: Record<string, any> = {}) => {
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track(event, {
        ...properties,
        timestamp: new Date().toISOString(),
      });
    }
  },
};

// Server-side analytics helper
export const analyticsServer = {
  identify: async (userId: string, traits: UserTraits = {}) => {
    try {
      await analytics.identify({
        userId,
        traits: {
          ...traits,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Segment identify error:', error);
    }
  },

  group: async (userId: string, groupId: string, traits: OrganizationTraits) => {
    try {
      await analytics.group({
        userId,
        groupId,
        traits: {
          ...traits,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Segment group error:', error);
    }
  },

  track: async (userId: string, event: string, properties: Record<string, any> = {}) => {
    try {
      await analytics.track({
        userId,
        event,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Segment track error:', error);
    }
  },
};

// Billing-specific analytics helpers
export const billingAnalytics = {
  trackUpgradeClick: (currentTier: SubscriptionTier, targetTier: SubscriptionTier, source: string) => {
    analyticsClient.track(ANALYTICS_EVENTS.BILLING.UPGRADE_CLICKED, {
      currentTier,
      targetTier,
      source,
      location: typeof window !== 'undefined' ? window.location.pathname : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer || 'direct' : undefined,
      viewportWidth: typeof window !== 'undefined' ? window.innerWidth : undefined,
      deviceType: typeof window !== 'undefined' ? (window.innerWidth < 768 ? 'mobile' : 'desktop') : undefined,
      timestamp: new Date().toISOString()
    });
  },

  trackUpgradePageView: (currentTier: SubscriptionTier) => {
    analyticsClient.track(ANALYTICS_EVENTS.BILLING.UPGRADE_PAGE_VIEWED, {
      currentTier,
      location: typeof window !== 'undefined' ? window.location.pathname : undefined,
      timestamp: new Date().toISOString()
    });
  },

  trackCheckoutStarted: (properties: BillingEventProperties) => {
    analyticsClient.track(ANALYTICS_EVENTS.BILLING.CHECKOUT_STARTED, properties);
  },

  trackCheckoutCompleted: (properties: BillingEventProperties) => {
    analyticsClient.track(ANALYTICS_EVENTS.BILLING.CHECKOUT_COMPLETED, properties);
  },

  trackCheckoutFailed: (properties: BillingEventProperties) => {
    analyticsClient.track(ANALYTICS_EVENTS.BILLING.CHECKOUT_FAILED, properties);
  },
};

// Helper functions for common tracking patterns
export const trackingHelpers = {
  trackOnboardingProgress: async (
    session: SelectOnboardingSession,
    stepCompleted: string,
    userId: string
  ) => {
    const properties = {
      sessionId: session.id,
      agentId: session.agentId,
      organizationId: session.organizationId,
      stepCompleted,
      progress: session.stepProgress,
      totalSteps: session.stepProgress?.steps.length,
      completedSteps: session.stepProgress?.steps.filter(s => s.completed).length,
    };

    await analyticsServer.track(userId, ANALYTICS_EVENTS.ONBOARDING.STEP_COMPLETED, properties);
  },

  trackAgentUsage: async (
    agent: SelectAgent,
    organizationId: string,
    userId: string,
    action: string
  ) => {
    const properties = {
      agentId: agent.id,
      agentName: agent.name,
      organizationId,
      siteId: agent.siteId,
      settings: agent.settings,
      action,
    };

    await analyticsServer.track(userId, ANALYTICS_EVENTS.FEATURE.AGENT_CREATED, properties);
  },

  trackOrganizationUpdate: async (
    organization: SelectOrganization,
    userId: string,
    updateType: string
  ) => {
    const properties = {
      organizationId: organization.id,
      organizationName: organization.name,
      updateType,
      metadata: organization.metadata,
    };

    await analyticsServer.track(
      userId,
      ANALYTICS_EVENTS.ORGANIZATION.UPDATED,
      properties
    );
  },
};




export * from './intercom';

