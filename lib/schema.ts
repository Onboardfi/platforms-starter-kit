// lib/schema.ts

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

// Users Table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  username: text('username'),
  gh_username: text('gh_username'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
});

// Sessions Table
export const sessions = pgTable(
  'sessions',
  {
    sessionToken: text('sessionToken').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (table) => {
    return {
      userIdIdx: index('sessions_userId_idx').on(table.userId),
    };
  }
);

// Verification Tokens Table
export const verificationTokens = pgTable(
  'verificationTokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (table) => {
    return {
      compositePk: primaryKey(table.identifier, table.token),
    };
  }
);

// Examples Table
export const examples = pgTable('examples', {
  id: serial('id').primaryKey(),
  name: text('name'),
  description: text('description'),
  domainCount: integer('domainCount'),
  url: text('url'),
  image: text('image'),
  imageBlurhash: text('imageBlurhash'),
});

// Accounts Table
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
  (table) => {
    return {
      userIdIdx: index('accounts_userId_idx').on(table.userId),
      compositePk: primaryKey(table.provider, table.providerAccountId),
    };
  }
);

// Sites Table
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
    message404: text('message404').default(
      sql`'Blimey! exist.'`
    ),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
    userId: text('userId').references(() => users.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
  },
  (table) => {
    return {
      userIdIdx: index('sites_userId_idx').on(table.userId),
    };
  }
);

// Define the Step interface
// In /lib/schema.ts

export type Step = {
  title: string;
  description: string;
  completionTool: "email" | "memory" | "notesTaken" | "notion" | null;
  completed: boolean;
};

// Agent Settings Interface
export interface AgentSettings {
  headingText?: string;
  tools?: string[];
  initialMessage?: string;
  steps?: Step[];
  // Add any other settings fields here
}

// Agents Table
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
    settings: jsonb('settings')
      .$type<AgentSettings>()
      .default(sql`'{}'::jsonb`)
      .notNull(),

  },
  (table) => {
    return {
      siteIdIdx: index('agents_siteId_idx').on(table.siteId),
      userIdIdx: index('agents_userId_idx').on(table.userId),
      slugSiteIdKey: uniqueIndex('agents_slug_siteId_key').on(table.slug, table.siteId),
    };
  }
);

// Agents Relations
export const agentsRelations = relations(agents, ({ one }) => ({
  site: one(sites, { references: [sites.id], fields: [agents.siteId] }),
  user: one(users, { references: [users.id], fields: [agents.userId] }),
}));

// Posts Table
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
  (table) => {
    return {
      siteIdIdx: index('posts_siteId_idx').on(table.siteId),
      userIdIdx: index('posts_userId_idx').on(table.userId),
      slugSiteIdKey: uniqueIndex('posts_slug_siteId_key').on(table.slug, table.siteId),
    };
  }
);

// Posts Relations
export const postsRelations = relations(posts, ({ one }) => ({
  site: one(sites, { references: [sites.id], fields: [posts.siteId] }),
  user: one(users, { references: [users.id], fields: [posts.userId] }),
}));

// Sites Relations
export const sitesRelations = relations(sites, ({ one, many }) => ({
  posts: many(posts),
  agents: many(agents),
  user: one(users, { references: [users.id], fields: [sites.userId] }),
}));

// Sessions Relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { references: [users.id], fields: [sessions.userId] }),
}));

// Accounts Relations
export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { references: [users.id], fields: [accounts.userId] }),
}));

// Users Relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  sites: many(sites),
  posts: many(posts),
  agents: many(agents),
}));

// Exported Types
export type SelectSite = typeof sites.$inferSelect;
export type SelectPost = typeof posts.$inferSelect;
export type SelectExample = typeof examples.$inferSelect;
export type SelectAgent = typeof agents.$inferSelect;
