
//Users/bobbygilbert/Documents/Github/platforms-starter-kit/lib/schema.ts
import { createId } from '@paralleldrive/cuid2';
import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Message and conversation types
export type MessageType = 'text' | 'audio' | 'transcript';
export type MessageRole = 'user' | 'assistant' | 'system';
export type ConversationStatus = 'active' | 'completed' | 'archived';


// Subscription tier limits (non-usage related)
export interface TierFeatureLimits {
  AGENTS: number;              // Number of agents allowed
  ONBOARDING_SESSIONS: number; // Number of onboarding sessions allowed
  INTEGRATIONS_PER_AGENT: number;
  // Add other feature-based limits here
  CUSTOM_DOMAIN: boolean;
  ADVANCED_ANALYTICS: boolean;
  TEAM_COLLABORATION: boolean;
}



// Subscription metadata - focused only on feature access
export interface SubscriptionMetadata {
  tier: 'BASIC' | 'PRO' | 'GROWTH';
  interval: 'MONTHLY' | 'YEARLY';
  status: 'active' | 'canceled' | 'past_due' | 'incomplete';
  currentPeriodEnd?: string;
  // Feature limits for the current tier
  limits: TierFeatureLimits;
  // Current usage of limited features
  currentUsage: {
    agentCount: number;
    sessionCount: number;
  };
}

// Metered usage metadata - completely separate from subscription
export interface MeteredUsageMetadata {
  tokenRates: {
    INPUT_TOKENS: number;  // Current rate per 1K tokens
    OUTPUT_TOKENS: number;
  };
  stripeMeters: {
    inputTokens: {
      meterId: string;
      priceId: string;
    };
    outputTokens: {
      meterId: string;
      priceId: string;
    };
  };
}



export interface OrganizationMetadata {
  companySize?: 'small' | 'medium' | 'large' | 'enterprise';
  industry?: string;
  stripe?: {
    stripeEnabled: boolean;
    // Separate subscription and usage tracking
    subscription: {
      id: string | null;     // Base subscription ID
      metadata: SubscriptionMetadata;
    };
    metered: {
      id: string | null;     // Metered subscription ID
      metadata: MeteredUsageMetadata;
    };
  };
  createdAt?: string;
  [key: string]: any;
}

export const organizationInvites = pgTable(
  'organization_invites',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role').$type<'owner' | 'admin' | 'member'>().notNull().default('member'),
    token: text('token').notNull().unique(),
    status: text('status')
      .$type<'pending' | 'accepted' | 'cancelled' | 'expired'>()
      .notNull()
      .default('pending'),
    invitedBy: text('invitedBy')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    invitedAt: timestamp('invitedAt', { mode: 'date' }).defaultNow().notNull(),
    expiresAt: timestamp('expiresAt', { mode: 'date' }).notNull(),
    acceptedAt: timestamp('acceptedAt', { mode: 'date' }),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  },
  (table) => ({
    emailOrgIdx: uniqueIndex('org_invites_email_org_idx').on(
      table.email,
      table.organizationId
    ),
    tokenIdx: index('org_invites_token_idx').on(table.token),
    statusIdx: index('org_invites_status_idx').on(table.status),
    orgIdIdx: index('org_invites_org_idx').on(table.organizationId),
  })
);


// In schema.ts, update the users table definition:

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name'),
  username: text('username'),
  gh_username: text('gh_username'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  stripeCustomerId: text('stripeCustomerId'),
  stripeSubscriptionId: text('stripeSubscriptionId'),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
});


export const sessions = pgTable(
  'sessions',
  {
    sessionToken: text('sessionToken').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (table) => ({
    userIdIdx: index('sessions_userId_idx').on(table.userId),
  })
);

export const verificationTokens = pgTable(
  'verificationTokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (table) => ({
    compositePk: primaryKey(table.identifier, table.token),
  })
);

export const examples = pgTable('examples', {
  id: serial('id').primaryKey(),
  name: text('name'),
  description: text('description'),
  domainCount: integer('domainCount'),
  url: text('url'),
  image: text('image'),
  imageBlurhash: text('imageBlurhash'),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    refresh_token_expires_in: integer('refresh_token_expires_in'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
    oauth_token_secret: text('oauth_token_secret'),
    oauth_token: text('oauth_token'),
  },
  (table) => ({
    userIdIdx: index('accounts_userId_idx').on(table.userId),
    compositePk: primaryKey(table.provider, table.providerAccountId),
  })
);
// Update the organizations table definition
export const organizations = pgTable(
  'organizations',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    createdBy: text('createdBy')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    logo: text('logo'),
    stripeCustomerId: text('stripeCustomerId'),
    stripeSubscriptionId: text('stripeSubscriptionId'),
    metadata: jsonb('metadata').$type<OrganizationMetadata>().default({}).notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex('organizations_slug_idx').on(table.slug),
    createdByIdx: index('organizations_createdBy_idx').on(table.createdBy),
  })
);
export type CreateOrganizationRequest = {
  name: string;
  slug: string;
  metadata?: OrganizationMetadata;
};

export type OrganizationResponse = {
  organization: typeof organizations.$inferSelect;
  requiresSessionUpdate: boolean;
};

export const organizationMemberships = pgTable(
  'organization_memberships',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').$type<'owner' | 'admin' | 'member'>().notNull().default('member'),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    orgUserIdx: uniqueIndex('org_memberships_org_user_idx').on(
      table.organizationId,
      table.userId
    ),
    userIdx: index('org_memberships_user_idx').on(table.userId),
  })
);



// Modify the sites table to reference organization instead of user
export const sites = pgTable(
  'sites',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    description: text('description'),
    logo: text('logo'),
    font: text('font').default('font-cal').notNull(),
    image: text('image'),
    imageBlurhash: text('imageBlurhash'),
    subdomain: text('subdomain').unique(),
    customDomain: text('customDomain').unique(),
    message404: text('message404').default(sql`'Blimey! This page does not exist.'`),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    createdBy: text('createdBy')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => ({
    organizationIdx: index('sites_organization_idx').on(table.organizationId),
    createdByIdx: index('sites_createdBy_idx').on(table.createdBy),
    subdomainIdx: index('sites_subdomain_idx').on(table.subdomain),
  })
);
export const agents = pgTable(
  'agents',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    description: text('description'),
    slug: text('slug').notNull(),
    image: text('image'),
    imageBlurhash: text('imageBlurhash'),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
    published: boolean('published').default(false).notNull(),
    siteId: text('siteId').references(() => sites.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
    createdBy: text('createdBy').references(() => users.id, {  // Changed from userId
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
    settings: jsonb('settings').$type<AgentSettings>().default(sql`'{}'::jsonb`).notNull(),
  },
  (table) => ({
    siteIdIdx: index('agents_siteId_idx').on(table.siteId),
    createdByIdx: index('agents_createdBy_idx').on(table.createdBy),  // Updated index name
    slugSiteIdKey: uniqueIndex('agents_slug_siteId_key').on(table.slug, table.siteId),
    sitePublishedIdx: index('agents_site_published_idx').on(table.siteId, table.published),
    settingsIdx: sql`CREATE INDEX IF NOT EXISTS agents_settings_idx ON agents USING gin (settings)`,
  })
);

export const posts = pgTable(
  'posts',
  {
    id: text('id').primaryKey(),
    title: text('title'),
    description: text('description'),
    content: text('content'),
    slug: text('slug').notNull(),
    image: text('image'),
    imageBlurhash: text('imageBlurhash'),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
    published: boolean('published').default(false).notNull(),
    siteId: text('siteId').references(() => sites.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
    createdBy: text('createdBy').references(() => users.id, {  // Changed from userId
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    siteIdIdx: index('posts_siteId_idx').on(table.siteId),
    createdByIdx: index('posts_createdBy_idx').on(table.createdBy),
    organizationIdx: index('posts_organization_idx').on(table.organizationId),
    slugSiteIdKey: uniqueIndex('posts_slug_siteId_key').on(table.slug, table.siteId),
  })
);


/**
 * Steps Table Definition
 */
export const steps = pgTable(
  'steps',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    agentId: text('agentId')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    orderIndex: text('orderIndex').notNull(),
    completionTool: text('completionTool').$type<'email' | 'memory' | 'notesTaken' | 'notion' | null>(),
    completed: boolean('completed').default(false).notNull(),
    completedAt: timestamp('completedAt', { mode: 'date' }),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    agentIdIdx: index('steps_agentId_idx').on(table.agentId),
    orderIdx: index('steps_order_idx').on(table.orderIndex),
    completedIdx: index('steps_completed_idx').on(table.completed),
  })
);

/**
 * Steps Relations
 */
export const stepsRelations = relations(steps, ({ one, many }) => ({
  agent: one(agents, {
    fields: [steps.agentId],
    references: [agents.id],
  }),
  messages: many(messages),
}));


// Add relations
export const organizationInvitesRelations = relations(
  organizationInvites,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationInvites.organizationId],
      references: [organizations.id],
    }),
    inviter: one(users, {
      fields: [organizationInvites.invitedBy],
      references: [users.id],
    }),
  })
);



export type SelectStep = typeof steps.$inferSelect;


// Add organizationId to onboardingSessions table
export const onboardingSessions = pgTable(
  'onboarding_sessions',
  {
    id: text('id').primaryKey(),
    agentId: text('agentId').references(() => agents.id, {
      onDelete: 'cascade'
    }),
    userId: text('userId').references(() => users.id, {
      onDelete: 'set null'
    }),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name'),
    clientIdentifier: text('clientIdentifier'),
    type: text('type').notNull(),
    status: text('status').notNull(),
    stepProgress: jsonb('stepProgress').$type<StepProgress>(),
    metadata: jsonb('metadata').$type<Record<string, any>>(),
    lastInteractionAt: timestamp('lastInteractionAt', { mode: 'date' }),
    startedAt: timestamp('startedAt', { mode: 'date' }).defaultNow(),
    completedAt: timestamp('completedAt', { mode: 'date' }),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    agentIdIdx: index('onboarding_sessions_agentId_idx').on(table.agentId),
    userIdIdx: index('onboarding_sessions_userId_idx').on(table.userId),
    organizationIdx: index('onboarding_sessions_organization_idx').on(table.organizationId),
    clientIdentifierIdx: index('onboarding_sessions_clientIdentifier_idx').on(table.clientIdentifier),
    statusIdx: index('onboarding_sessions_status_idx').on(table.status),
    agentUserStatusIdx: index('onboarding_sessions_agent_user_status_idx').on(
      table.agentId,
      table.userId,
      table.status
    ),
  })
);

export const conversations = pgTable(
  'conversations',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    sessionId: text('sessionId').references(() => onboardingSessions.id, {
      onDelete: 'cascade',
    }),
    status: text('status').$type<ConversationStatus>().notNull().default('active'),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
    startedAt: timestamp('startedAt', { mode: 'date' }).defaultNow().notNull(),
    endedAt: timestamp('endedAt', { mode: 'date' }),
    lastMessageAt: timestamp('lastMessageAt', { mode: 'date' }),
    messageCount: integer('messageCount').default(0),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    sessionIdx: index('conversations_session_idx').on(table.sessionId),
    statusIdx: index('conversations_status_idx').on(table.status),
    timeframeIdx: index('conversations_timeframe_idx').on(table.startedAt, table.endedAt),
  })
);



// Add a table specifically for tracking organization tier usage
export const organizationTierUsage = pgTable(
  'organization_tier_usage',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    organizationId: text('organizationId')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    // Track actual database entity counts
    currentAgentCount: integer('currentAgentCount').default(0),
    currentSessionCount: integer('currentSessionCount').default(0),
    // Token usage
    currentInputTokens: integer('currentInputTokens').default(0),
    currentOutputTokens: integer('currentOutputTokens').default(0),
    // Limits based on current tier
    maxAgents: integer('maxAgents').notNull(),
    maxSessions: integer('maxSessions').notNull(),
    maxInputTokens: integer('maxInputTokens').notNull(),
    maxOutputTokens: integer('maxOutputTokens').notNull(),
    // Billing period tracking
    billingPeriodStart: timestamp('billingPeriodStart', { mode: 'date' }).notNull(),
    billingPeriodEnd: timestamp('billingPeriodEnd', { mode: 'date' }).notNull(),
    // Track when usage was last updated
    lastUpdated: timestamp('lastUpdated', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index('org_tier_usage_org_idx').on(table.organizationId),
    periodIdx: index('org_tier_usage_period_idx').on(
      table.billingPeriodStart, 
      table.billingPeriodEnd
    ),
  })
);



// Subscription feature usage tracking
export const subscriptionFeatureUsage = pgTable(
  'subscription_feature_usage',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    organizationId: text('organizationId')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    // Feature limits tracking
    agentCount: integer('agentCount').default(0),
    sessionCount: integer('sessionCount').default(0),
    integrationsCount: jsonb('integrationsCount').$type<Record<string, number>>().default({}),
    // Limit information
    tier: text('tier').$type<'BASIC' | 'PRO' | 'GROWTH'>().notNull(),
    maxAgents: integer('maxAgents').notNull(),
    maxSessions: integer('maxSessions').notNull(),
    // Track when usage was last calculated
    lastUpdated: timestamp('lastUpdated', { mode: 'date' }).defaultNow().notNull(),
    // Billing period tracking
    billingPeriodStart: timestamp('billingPeriodStart', { mode: 'date' }).notNull(),
    billingPeriodEnd: timestamp('billingPeriodEnd', { mode: 'date' }).notNull(),
  }
);

// Track feature access events
export const featureAccessEvents = pgTable(
  'feature_access_events',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    organizationId: text('organizationId')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    feature: text('feature').notNull(),
    action: text('action').$type<'granted' | 'denied'>().notNull(),
    reason: text('reason').notNull(),
    metadata: jsonb('metadata').$type<{
      tier?: string;
      limit?: number;
      currentUsage?: number;
    }>().default({}),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  }
);
/**
 * Messages Table with Step Reference
 */
export const messages = pgTable(
  'messages',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    conversationId: text('conversationId')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    type: text('type').$type<MessageType>().notNull(),
    role: text('role').$type<MessageRole>().notNull(),
    content: jsonb('content').$type<{
      text?: string;
      audioUrl?: string;
      transcript?: string;
    }>().notNull(),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
    toolCalls: jsonb('toolCalls').$type<Array<{
      tool: string;
      input: Record<string, any>;
      result?: Record<string, any>;
      error?: string;
    }>>().default([]),
    stepId: text('stepId').references(() => steps.id, { 
      onDelete: 'set null' 
    }),
    orderIndex: text('orderIndex').notNull(),
    parentMessageId: text('parentMessageId').references((): any => messages.id),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    conversationIdx: index('messages_conversation_idx').on(table.conversationId),
    typeRoleIdx: index('messages_type_role_idx').on(table.type, table.role),
    orderIdx: index('messages_order_idx').on(table.orderIndex),
    stepIdx: index('messages_step_idx').on(table.stepId),
    parentIdx: index('messages_parent_idx').on(table.parentMessageId),
    createdAtIdx: index('messages_created_at_idx').on(table.createdAt),
  })
);


export const usageLogs = pgTable(
  'usage_logs',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    userId: text('userId')
      .references(() => users.id, { onDelete: 'set null' }),
    sessionId: text('sessionId')
      .references(() => onboardingSessions.id, { onDelete: 'set null' }),
    conversationId: text('conversationId')
      .references(() => conversations.id, { onDelete: 'set null' }),
    messageId: text('messageId')
      .references(() => messages.id, { onDelete: 'set null' }),
    durationSeconds: integer('durationSeconds').notNull(),
    promptTokens: integer('promptTokens').notNull().default(0), // Updated
    completionTokens: integer('completionTokens').notNull().default(0), // Updated
    totalTokens: integer('totalTokens').notNull().default(0), // Updated
    messageRole: text('messageRole').$type<'assistant' | 'user'>().notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(), // Added
    stripeCustomerId: text('stripeCustomerId'),
    stripeEventId: text('stripeEventId'),
    reportingStatus: text('reportingStatus')
      .$type<'pending' | 'reported'>()
      .notNull()
      .default('pending'), // Ensured not nullable
    organizationId: text('organizationId')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => ({
    userIdIdx: index('usage_logs_userId_idx').on(table.userId),
    sessionIdIdx: index('usage_logs_sessionId_idx').on(table.sessionId),
    conversationIdIdx: index('usage_logs_conversationId_idx').on(table.conversationId),
    createdAtIdx: index('usage_logs_createdAt_idx').on(table.createdAt),
    organizationIdx: index('usage_logs_organization_idx').on(table.organizationId),
  })
);

export const systemLogs = pgTable(
  'system_logs',
  {
    id: text('id').primaryKey().default(createId()),
    type: text('type').notNull(),
    message: text('message').notNull(),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
    source: text('source'),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index('system_logs_type_idx').on(table.type),
    createdAtIdx: index('system_logs_created_at_idx').on(table.createdAt),
  })
);

export type Step = {
  [x: string]: any;
  title: string;
  description: string;
  completionTool: 'email' | 'memory' | 'notesTaken' | 'notion' | null;
  completed: boolean;
};

export type StepProgress = {
  steps: Array<Step & {
    id: string;
    completedAt?: string;
  }>;
};

export interface AgentSettings {
  headingText?: string;
  tools?: string[];
  initialMessage?: string;
  steps?: Step[];
  primaryColor?: string;
  secondaryColor?: string;
  aiModel?: string;
  apiKeys?: {
    [model: string]: string;
  };
  onboardingType: 'internal' | 'external';
  allowMultipleSessions?: boolean;
  authentication: {
    enabled: boolean;
    password?: string;
    message?: string;
  };
}







export const agentsRelations = relations(agents, ({ one }) => ({
  site: one(sites, { references: [sites.id], fields: [agents.siteId] }),
  creator: one(users, { references: [users.id], fields: [agents.createdBy] }), // Correct relation
}));



// Update posts relations
export const postsRelations = relations(posts, ({ one }) => ({
  site: one(sites, { references: [sites.id], fields: [posts.siteId] }),
  creator: one(users, { references: [users.id], fields: [posts.createdBy] }), // Updated from userId
  organization: one(organizations, {
    fields: [posts.organizationId],
    references: [organizations.id],
  }),
}));

// Update sites relations to use createdBy and add organization
export const sitesRelations = relations(sites, ({ one, many }) => ({
  posts: many(posts),
  agents: many(agents),
  creator: one(users, { references: [users.id], fields: [sites.createdBy] }),
  organization: one(organizations, {
    fields: [sites.organizationId],
    references: [organizations.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { references: [users.id], fields: [sessions.userId] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { references: [users.id], fields: [accounts.userId] }),
}));


// Ensure organization relations are complete
export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  memberships: many(organizationMemberships),
  sites: many(sites),
  creator: one(users, {
    fields: [organizations.createdBy],
    references: [users.id],
  }),
}));


export const organizationMembershipsRelations = relations(
  organizationMemberships,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationMemberships.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationMemberships.userId],
      references: [users.id],
    }),
  })
);


// Update user relations to include all relationships
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  organizationMemberships: many(organizationMemberships),
  createdOrganizations: many(organizations, { relationName: 'creator' }),
  createdSites: many(sites, { relationName: 'creator' }),
  createdAgents: many(agents), // Consider updating relationName for consistency
  createdPosts: many(posts), // Consider updating relationName for consistency
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  session: one(onboardingSessions, {
    fields: [conversations.sessionId],
    references: [onboardingSessions.id],
  }),
  messages: many(messages),
}));

/**
 * Message Relations with Step Reference
 */
export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  parentMessage: one(messages, {
    fields: [messages.parentMessageId],
    references: [messages.id],
  }),
  step: one(steps, {
    fields: [messages.stepId],
    references: [steps.id],
  }),
}));

export const onboardingSessionsRelations = relations(onboardingSessions, ({ one, many }) => ({
  agent: one(agents, { references: [agents.id], fields: [onboardingSessions.agentId] }),
  user: one(users, { references: [users.id], fields: [onboardingSessions.userId] }),
  conversations: many(conversations),
}));




// Update SelectMessage type to include step reference
export type SelectMessage = typeof messages.$inferSelect & {
  parentMessage?: SelectMessage;
  conversation?: SelectConversation;
  step?: SelectStep;
};

export type SelectConversation = typeof conversations.$inferSelect & {
  messages?: SelectMessage[];
  session?: SelectOnboardingSession;
};


export type AgentWithSite = typeof agents.$inferSelect & {
  site: SelectSite;
  creator: typeof users.$inferSelect;
};

export type AgentWithRelations = typeof agents.$inferSelect & {
  site: SelectSite & {
    organization: SelectOrganization;
    creator: typeof users.$inferSelect;
  };
  creator: typeof users.$inferSelect;
};


// Update the existing SelectAgent type
export type SelectAgent = typeof agents.$inferSelect & {
  site?: SelectSite & {
    organization?: SelectOrganization;
    creator?: typeof users.$inferSelect;
  };
  creator: typeof users.$inferSelect; // Reflects the 'creator' relation
  siteName?: string | null;
  settings: AgentSettings;
  _count?: {
    sessions: number;
  };
};

// Add organization-related types
export type SelectOrganizationWithRelations = SelectOrganization & {
  memberships?: SelectOrganizationMembership[];
  sites?: SelectSite[];
  creator?: typeof users.$inferSelect;
};


export type SelectOrganizationMembershipWithRelations = SelectOrganizationMembership & {
  organization?: SelectOrganization;
  user?: typeof users.$inferSelect;
};

// Update SelectSite type to include organization
export type SelectSite = typeof sites.$inferSelect & {
  organization: SelectOrganization;
  creator: typeof users.$inferSelect;
  _count?: {
    agents: number;
  };
};

// Update the type definitions to match the new schema
export type SelectPost = typeof posts.$inferSelect & {
  site?: SelectSite;
  creator?: typeof users.$inferSelect;
  organization?: SelectOrganization;
};

export type SelectExample = typeof examples.$inferSelect;

export type SelectOnboardingSession = typeof onboardingSessions.$inferSelect & {
  organizationId: string;
  conversations?: SelectConversation[];
  agent?: SelectAgent;
  user?: typeof users.$inferSelect;
};

export type SelectSystemLog = typeof systemLogs.$inferSelect;

// Constants for Redis key patterns
export const CONVERSATION_KEY_PREFIX = 'conversation:';
export const MESSAGE_KEY_PREFIX = 'message:';
export const ACTIVE_CONVERSATIONS_SET = 'active_conversations';
export const MESSAGE_ORDER_PREFIX = 'message_order:';

// Utility types for message content
export type MessageContent = {
  text?: string;
  audioUrl?: string;
  transcript?: string;
  metadata?: Record<string, any>;
};

export type ToolCall = {
  tool: string;
  input: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  timestamp: string;
  duration?: number;
};

export type MessageMetadata = {
  clientId?: string;
  deviceInfo?: Record<string, any>;
  processingTime?: number;
  completionTokens?: number;
  promptTokens?: number;
  totalTokens?: number;
  toolCalls?: ToolCall[];
  stepId?: string;
  stepTitle?: string;
  isFinal?: boolean;
  audioDurationSeconds?: number;  // Add this
};

export type ConversationMetadata = {
  agentVersion?: string;
  clientType?: string;
  clientVersion?: string;
  sessionType?: 'internal' | 'external';
  completedSteps?: string[];
  toolsUsed?: string[];
  duration?: number;
  messageCount?: number;
  lastToolUse?: {
    tool: string;
    timestamp: string;
    success: boolean;
  };
};

export type SelectUsageLog = typeof usageLogs.$inferSelect;
// Add types for organization queries
export type SelectOrganization = typeof organizations.$inferSelect;
export type SelectOrganizationMembership = typeof organizationMemberships.$inferSelect;
// Export Redis key generation utilities
export const getConversationKey = (conversationId: string) => 
  `${CONVERSATION_KEY_PREFIX}${conversationId}`;

export const getMessageKey = (messageId: string) => 
  `${MESSAGE_KEY_PREFIX}${messageId}`;

export const getMessageOrderKey = (conversationId: string) => 
  `${MESSAGE_ORDER_PREFIX}${conversationId}`;


export type SelectOrganizationInvite = typeof organizationInvites.$inferSelect;
export type InsertOrganizationInvite = typeof organizationInvites.$inferInsert;