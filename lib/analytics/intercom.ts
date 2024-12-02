///Users/bobbygilbert/Documents/Github/platforms-starter-kit/lib/analytics/intercom.ts

import crypto from 'crypto';
import { analyticsClient } from './index';
import type { UserTraits, OrganizationTraits } from './index';

// Define Intercom-specific options
interface IntercomIntegrationOptions {
  user_hash?: string;
  hideDefaultLauncher?: boolean;
  [key: string]: any;
}

// Enhanced analytics client with Intercom Identity Verification
export const enhancedAnalyticsClient = {
  identify: (
    userId: string,
    traits: UserTraits = {},
    intercomSecretKey?: string
  ) => {
    if (typeof window === 'undefined' || !window.analytics) return;

    // If we have an Intercom secret key, generate the hash and include it in traits
    if (intercomSecretKey) {
      const userHash = crypto
        .createHmac('sha256', intercomSecretKey)
        .update(userId)
        .digest('hex');

      // Merge the Intercom configuration into the traits
      traits = {
        ...traits,
        updatedAt: new Date().toISOString(),
        integrations: {
          Intercom: {
            user_hash: userHash,
            hideDefaultLauncher: false
          }
        }
      };
    }

    // Call identify with merged traits
    window.analytics.identify(userId, traits);
  },

  group: (
    groupId: string,
    traits: OrganizationTraits,
    userId?: string,
    intercomSecretKey?: string
  ) => {
    if (typeof window === 'undefined' || !window.analytics) return;

    // If we have both userId and intercomSecretKey, include the hash
    if (userId && intercomSecretKey) {
      const userHash = crypto
        .createHmac('sha256', intercomSecretKey)
        .update(userId)
        .digest('hex');

      // Merge the Intercom configuration into the traits
      traits = {
        ...traits,
        updatedAt: new Date().toISOString(),
        integrations: {
          Intercom: {
            user_hash: userHash
          }
        }
      };
    }

    // Call group with merged traits
    window.analytics.group(groupId, traits);
  },

  // Reuse existing analytics methods
  track: analyticsClient.track,
  page: analyticsClient.page
};

// Helper functions remain the same...
export function generateIntercomHash(userId: string, secretKey: string): string {
  return crypto
    .createHmac('sha256', secretKey)
    .update(userId)
    .digest('hex');
}

export function identifyUserWithIntercom(
  userId: string,
  userTraits: UserTraits,
  organizationId?: string,
  organizationTraits?: OrganizationTraits
) {
  const INTERCOM_SECRET_KEY = process.env.NEXT_PUBLIC_INTERCOM_IDENTITY_VERIFICATION_SECRET;

  if (!INTERCOM_SECRET_KEY) {
    console.warn('Intercom secret key is not configured');
    return;
  }

  // Identify user with Intercom hash
  enhancedAnalyticsClient.identify(userId, userTraits, INTERCOM_SECRET_KEY);

  // If we have organization data, make a group call
  if (organizationId && organizationTraits) {
    enhancedAnalyticsClient.group(
      organizationId,
      organizationTraits,
      userId,
      INTERCOM_SECRET_KEY
    );
  }
}