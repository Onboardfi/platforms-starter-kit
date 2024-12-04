CREATE TABLE IF NOT EXISTS "accounts" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"refresh_token_expires_in" integer,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	"oauth_token_secret" text,
	"oauth_token" text,
	CONSTRAINT "accounts_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"description" text,
	"slug" text NOT NULL,
	"image" text,
	"imageBlurhash" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"siteId" text,
	"createdBy" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionId" text,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"endedAt" timestamp,
	"lastMessageAt" timestamp,
	"messageCount" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "examples" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"description" text,
	"domainCount" integer,
	"url" text,
	"image" text,
	"imageBlurhash" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feature_access_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"feature" text NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversationId" text NOT NULL,
	"type" text NOT NULL,
	"role" text NOT NULL,
	"content" jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"toolCalls" jsonb DEFAULT '[]'::jsonb,
	"stepId" text,
	"orderIndex" text NOT NULL,
	"parentMessageId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "onboarding_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"agentId" text,
	"userId" text,
	"organizationId" text NOT NULL,
	"name" text,
	"clientIdentifier" text,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"stepProgress" jsonb,
	"metadata" jsonb,
	"lastInteractionAt" timestamp,
	"startedAt" timestamp DEFAULT now(),
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invitedBy" text NOT NULL,
	"invitedAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"acceptedAt" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "organization_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_tier_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"currentAgentCount" integer DEFAULT 0,
	"currentSessionCount" integer DEFAULT 0,
	"currentInputTokens" integer DEFAULT 0,
	"currentOutputTokens" integer DEFAULT 0,
	"maxAgents" integer NOT NULL,
	"maxSessions" integer NOT NULL,
	"maxInputTokens" integer NOT NULL,
	"maxOutputTokens" integer NOT NULL,
	"billingPeriodStart" timestamp NOT NULL,
	"billingPeriodEnd" timestamp NOT NULL,
	"lastUpdated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"createdBy" text NOT NULL,
	"logo" text,
	"stripeCustomerId" text,
	"stripeSubscriptionId" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text,
	"description" text,
	"content" text,
	"slug" text NOT NULL,
	"image" text,
	"imageBlurhash" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"siteId" text,
	"createdBy" text,
	"organizationId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sites" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"description" text,
	"logo" text,
	"font" text DEFAULT 'font-cal' NOT NULL,
	"image" text,
	"imageBlurhash" text,
	"subdomain" text,
	"customDomain" text,
	"message404" text DEFAULT 'Blimey! This page does not exist.',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"organizationId" text NOT NULL,
	"createdBy" text NOT NULL,
	CONSTRAINT "sites_subdomain_unique" UNIQUE("subdomain"),
	CONSTRAINT "sites_customDomain_unique" UNIQUE("customDomain")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "steps" (
	"id" text PRIMARY KEY NOT NULL,
	"agentId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"orderIndex" text NOT NULL,
	"completionTool" text,
	"completed" boolean DEFAULT false NOT NULL,
	"completedAt" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_feature_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"agentCount" integer DEFAULT 0,
	"sessionCount" integer DEFAULT 0,
	"integrationsCount" jsonb DEFAULT '{}'::jsonb,
	"tier" text NOT NULL,
	"maxAgents" integer NOT NULL,
	"maxSessions" integer NOT NULL,
	"lastUpdated" timestamp DEFAULT now() NOT NULL,
	"billingPeriodStart" timestamp NOT NULL,
	"billingPeriodEnd" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_logs" (
	"id" text PRIMARY KEY DEFAULT 'hoqcb1yzzdbabis7yzz5fzqp' NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"source" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usage_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"sessionId" text,
	"conversationId" text,
	"messageId" text,
	"durationSeconds" integer NOT NULL,
	"promptTokens" integer DEFAULT 0 NOT NULL,
	"completionTokens" integer DEFAULT 0 NOT NULL,
	"totalTokens" integer DEFAULT 0 NOT NULL,
	"messageRole" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"stripeCustomerId" text,
	"stripeEventId" text,
	"reportingStatus" text DEFAULT 'pending' NOT NULL,
	"organizationId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"username" text,
	"gh_username" text,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"image" text,
	"stripeCustomerId" text,
	"stripeSubscriptionId" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verificationTokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationTokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agents" ADD CONSTRAINT "agents_siteId_sites_id_fk" FOREIGN KEY ("siteId") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agents" ADD CONSTRAINT "agents_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_sessionId_onboarding_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."onboarding_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feature_access_events" ADD CONSTRAINT "feature_access_events_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_conversations_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_stepId_steps_id_fk" FOREIGN KEY ("stepId") REFERENCES "public"."steps"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_parentMessageId_messages_id_fk" FOREIGN KEY ("parentMessageId") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_agentId_agents_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_invitedBy_users_id_fk" FOREIGN KEY ("invitedBy") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_tier_usage" ADD CONSTRAINT "organization_tier_usage_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organizations" ADD CONSTRAINT "organizations_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_siteId_sites_id_fk" FOREIGN KEY ("siteId") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sites" ADD CONSTRAINT "sites_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sites" ADD CONSTRAINT "sites_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "steps" ADD CONSTRAINT "steps_agentId_agents_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription_feature_usage" ADD CONSTRAINT "subscription_feature_usage_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_sessionId_onboarding_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."onboarding_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_conversationId_conversations_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_messageId_messages_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_userId_idx" ON "accounts" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agents_siteId_idx" ON "agents" USING btree ("siteId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agents_createdBy_idx" ON "agents" USING btree ("createdBy");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agents_slug_siteId_key" ON "agents" USING btree ("slug","siteId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agents_site_published_idx" ON "agents" USING btree ("siteId","published");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_session_idx" ON "conversations" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_status_idx" ON "conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_timeframe_idx" ON "conversations" USING btree ("startedAt","endedAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_conversation_idx" ON "messages" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_type_role_idx" ON "messages" USING btree ("type","role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_order_idx" ON "messages" USING btree ("orderIndex");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_step_idx" ON "messages" USING btree ("stepId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_parent_idx" ON "messages" USING btree ("parentMessageId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_created_at_idx" ON "messages" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_sessions_agentId_idx" ON "onboarding_sessions" USING btree ("agentId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_sessions_userId_idx" ON "onboarding_sessions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_sessions_organization_idx" ON "onboarding_sessions" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_sessions_clientIdentifier_idx" ON "onboarding_sessions" USING btree ("clientIdentifier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_sessions_status_idx" ON "onboarding_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_sessions_agent_user_status_idx" ON "onboarding_sessions" USING btree ("agentId","userId","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_invites_email_org_idx" ON "organization_invites" USING btree ("email","organizationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_invites_token_idx" ON "organization_invites" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_invites_status_idx" ON "organization_invites" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_invites_org_idx" ON "organization_invites" USING btree ("organizationId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_memberships_org_user_idx" ON "organization_memberships" USING btree ("organizationId","userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_memberships_user_idx" ON "organization_memberships" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_tier_usage_org_idx" ON "organization_tier_usage" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_tier_usage_period_idx" ON "organization_tier_usage" USING btree ("billingPeriodStart","billingPeriodEnd");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organizations_createdBy_idx" ON "organizations" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_siteId_idx" ON "posts" USING btree ("siteId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_createdBy_idx" ON "posts" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_organization_idx" ON "posts" USING btree ("organizationId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "posts_slug_siteId_key" ON "posts" USING btree ("slug","siteId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_userId_idx" ON "sessions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sites_organization_idx" ON "sites" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sites_createdBy_idx" ON "sites" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sites_subdomain_idx" ON "sites" USING btree ("subdomain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "steps_agentId_idx" ON "steps" USING btree ("agentId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "steps_order_idx" ON "steps" USING btree ("orderIndex");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "steps_completed_idx" ON "steps" USING btree ("completed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_logs_type_idx" ON "system_logs" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_logs_created_at_idx" ON "system_logs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_userId_idx" ON "usage_logs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_sessionId_idx" ON "usage_logs" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_conversationId_idx" ON "usage_logs" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_createdAt_idx" ON "usage_logs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_organization_idx" ON "usage_logs" USING btree ("organizationId");