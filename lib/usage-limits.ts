
//Users/bobbygilbert/Documents/Github/platforms-starter-kit/lib/usage-limits.ts
import { eq, sql } from "drizzle-orm";
import db from "@/lib/db";
import { organizations, agents, sites, onboardingSessions } from "@/lib/schema";
import type { OrganizationMetadata } from "@/lib/schema";
import { STRIPE_CONFIG } from "@/lib/stripe-config";

interface UsageLimits {
  currentCount: number;
  maxAllowed: number;
  canCreate: boolean;
  tier: 'BASIC' | 'PRO' | 'GROWTH';
  error?: string;
}

// Check agent limits for an organization
export async function checkAgentLimits(organizationId: string): Promise<UsageLimits> {
  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  // Get current tier from organization metadata
  const tier = organization.metadata?.stripe?.subscription?.metadata?.tier || 'BASIC';
  
  // If PRO or GROWTH, no limits
  if (tier === 'PRO' || tier === 'GROWTH') {
    return {
      currentCount: 0,
      maxAllowed: -1,  // -1 indicates unlimited
      canCreate: true,
      tier
    };
  }

  // For BASIC tier, enforce limits
  const maxAgents = STRIPE_CONFIG.TIERS.BASIC.LIMITS.ONBOARDS;
  
  const currentCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(agents)
    .innerJoin(sites, eq(agents.siteId, sites.id))
    .where(eq(sites.organizationId, organizationId))
    .then(result => result[0].count);

  return {
    currentCount,
    maxAllowed: maxAgents,
    canCreate: currentCount < maxAgents,
    tier,
    error: currentCount >= maxAgents ? 
      `Agent limit reached. Your ${tier} plan allows ${maxAgents} agents. Please upgrade to create more agents.` : 
      undefined
  };
}

// Check session limits for an organization
export async function checkSessionLimits(organizationId: string): Promise<UsageLimits> {
  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  const tier = organization.metadata?.stripe?.subscription?.metadata?.tier || 'BASIC';
  
  if (tier === 'PRO' || tier === 'GROWTH') {
    return {
      currentCount: 0,
      maxAllowed: -1,
      canCreate: true,
      tier
    };
  }

  const maxSessions = STRIPE_CONFIG.TIERS.BASIC.LIMITS.SESSIONS;
  const currentCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(onboardingSessions)
    .where(eq(onboardingSessions.organizationId, organizationId))
    .then(result => result[0].count);

  return {
    currentCount,
    maxAllowed: maxSessions,
    canCreate: currentCount < maxSessions,
    tier,
    error: currentCount >= maxSessions ? 
      `Session limit reached. Your ${tier} plan allows ${maxSessions} sessions. Please upgrade to create more sessions.` : 
      undefined
  };
}

// Update metadata counts
export async function updateUsageCounts(organizationId: string, type: 'agent' | 'session', increment: boolean = true): Promise<void> {
  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!organization || !organization.metadata) {
    throw new Error("Organization not found or missing metadata");
  }

  const currentMetadata = organization.metadata;
  const currentAgentCount = currentMetadata?.stripe?.subscription?.metadata?.currentUsage?.agentCount ?? 0;
  const currentSessionCount = currentMetadata?.stripe?.subscription?.metadata?.currentUsage?.sessionCount ?? 0;

  const updatedMetadata: OrganizationMetadata = {
    ...currentMetadata,
    stripe: {
      stripeEnabled: currentMetadata.stripe?.stripeEnabled ?? true,
      subscription: {
        id: currentMetadata.stripe?.subscription?.id ?? null,
        metadata: {
          tier: 'BASIC',
          interval: 'MONTHLY',
          status: 'active',
          currentPeriodEnd: currentMetadata.stripe?.subscription?.metadata?.currentPeriodEnd,
          limits: {
            AGENTS: 5,
            ONBOARDING_SESSIONS: 50,
            INTEGRATIONS_PER_AGENT: 2,
            CUSTOM_DOMAIN: false,
            ADVANCED_ANALYTICS: false,
            TEAM_COLLABORATION: false
          },
          currentUsage: {
            agentCount: type === 'agent' ? 
              (increment ? currentAgentCount + 1 : Math.max(0, currentAgentCount - 1)) : 
              currentAgentCount,
            sessionCount: type === 'session' ? 
              (increment ? currentSessionCount + 1 : Math.max(0, currentSessionCount - 1)) : 
              currentSessionCount
          }
        }
      },
      metered: currentMetadata.stripe?.metered ?? {
        id: null,
        metadata: {
          tokenRates: {
            INPUT_TOKENS: 0,
            OUTPUT_TOKENS: 0
          },
          stripeMeters: {
            inputTokens: {
              meterId: '',
              priceId: ''
            },
            outputTokens: {
              meterId: '',
              priceId: ''
            }
          }
        }
      }
    }
  };

  await db
    .update(organizations)
    .set({
      metadata: updatedMetadata
    })
    .where(eq(organizations.id, organizationId));
}

// Convenience functions
export const incrementSessionCount = (organizationId: string) => 
  updateUsageCounts(organizationId, 'session', true);

export const decrementSessionCount = (organizationId: string) => 
  updateUsageCounts(organizationId, 'session', false);

export const incrementAgentCount = (organizationId: string) => 
  updateUsageCounts(organizationId, 'agent', true);

export const decrementAgentCount = (organizationId: string) => 
  updateUsageCounts(organizationId, 'agent', false);