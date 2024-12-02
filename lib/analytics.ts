// lib/analytics.ts

// Export the types so they can be imported by other components
export type UserTraits = {
    email?: string;
    name?: string;
    createdAt?: string;
    organizationId?: string;
    organizationName?: string;
    role?: string;
    lastLogin?: string;
    onboardingCompleted?: boolean;
    onboardingCompletedAt?: string;
    siteId?: string;
    companySize?: string;
    industry?: string;
    [key: string]: any;
  };
  
  export type OrganizationTraits = {
    name: string;
    tier?: string;
    createdAt?: string;
    memberCount?: number;
    industry?: string;
    companySize?: string;
    [key: string]: any;
  };
  
  // Update the ANALYTICS_EVENTS constant to include all event categories
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
    BILLING: {
      UPGRADE_CLICKED: 'Upgrade Button Clicked',
      UPGRADE_PAGE_VIEWED: 'Upgrade Page Viewed',
      CHECKOUT_STARTED: 'Checkout Started',
      CHECKOUT_COMPLETED: 'Checkout Completed',
      CHECKOUT_FAILED: 'Checkout Failed',
      PLAN_CHANGED: 'Plan Changed'
    }
  } as const;
  
  // Update the analytics client interface to include group method
  export const analyticsClient = {
    identify: (userId: string, traits: UserTraits = {}) => {
      if (typeof window !== 'undefined' && window.analytics) {
        window.analytics.identify(userId, {
          ...traits,
          updatedAt: new Date().toISOString(),
        });
      }
    },
  
    group: (groupId: string, traits: OrganizationTraits) => {
      if (typeof window !== 'undefined' && window.analytics) {
        window.analytics.group(groupId, {
          ...traits,
          updatedAt: new Date().toISOString(),
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
  
    page: (name: string, properties: Record<string, any> = {}) => {
      if (typeof window !== 'undefined' && window.analytics) {
        window.analytics.page(name, {
          ...properties,
          timestamp: new Date().toISOString(),
        });
      }
    },
  };