
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

export type SelectStep = typeof steps.$inferSelect;








export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name'),
  username: text('username'),
  gh_username: text('gh_username'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
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
    userId: text('userId').references(() => users.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
  },
  (table) => ({
    userIdIdx: index('sites_userId_idx').on(table.userId),
    subdomainIdx: index('sites_subdomain_idx').on(table.subdomain),
    subdomainUserIdx: index('sites_subdomain_user_idx').on(table.subdomain, table.userId),
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
    userId: text('userId').references(() => users.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
    settings: jsonb('settings').$type<AgentSettings>().default(sql`'{}'::jsonb`).notNull(),
  },
  (table) => ({
    siteIdIdx: index('agents_siteId_idx').on(table.siteId),
    userIdIdx: index('agents_userId_idx').on(table.userId),
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
    userId: text('userId').references(() => users.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
  },
  (table) => ({
    siteIdIdx: index('posts_siteId_idx').on(table.siteId),
    userIdIdx: index('posts_userId_idx').on(table.userId),
    slugSiteIdKey: uniqueIndex('posts_slug_siteId_key').on(table.slug, table.siteId),
  })
);

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

export const agentsRelations = relations(agents, ({ one }) => ({
  site: one(sites, { references: [sites.id], fields: [agents.siteId] }),
  user: one(users, { references: [users.id], fields: [agents.userId] }),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  site: one(sites, { references: [sites.id], fields: [posts.siteId] }),
  user: one(users, { references: [users.id], fields: [posts.userId] }),
}));

export const sitesRelations = relations(sites, ({ one, many }) => ({
  posts: many(posts),
  agents: many(agents),
  user: one(users, { references: [users.id], fields: [sites.userId] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { references: [users.id], fields: [sessions.userId] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { references: [users.id], fields: [accounts.userId] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  sites: many(sites),
  posts: many(posts),
  agents: many(agents),
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

export type SelectAgent = typeof agents.$inferSelect & {
  site: typeof sites.$inferSelect | null;
  siteName?: string | null;
  userName?: string | null;
  settings: AgentSettings;
  _count?: {
    sessions: number;
  };
};

export type SelectSite = typeof sites.$inferSelect & {
  _count?: {
    agents: number;
  };
};

export type SelectPost = typeof posts.$inferSelect;

export type SelectExample = typeof examples.$inferSelect;

export type SelectOnboardingSession = typeof onboardingSessions.$inferSelect & {
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

// Export Redis key generation utilities
export const getConversationKey = (conversationId: string) => 
  `${CONVERSATION_KEY_PREFIX}${conversationId}`;

export const getMessageKey = (messageId: string) => 
  `${MESSAGE_KEY_PREFIX}${messageId}`;

export const getMessageOrderKey = (conversationId: string) => 
  `${MESSAGE_ORDER_PREFIX}${conversationId}`;