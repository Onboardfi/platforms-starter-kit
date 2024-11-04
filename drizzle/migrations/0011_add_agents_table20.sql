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
ALTER TABLE "onboarding_sessions" DROP CONSTRAINT "onboarding_sessions_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ALTER COLUMN "createdAt" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ALTER COLUMN "updatedAt" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "system_logs" ALTER COLUMN "id" SET DEFAULT 'wdpo1fgm15k48mycsw2o7y33';--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_sessionId_onboarding_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."onboarding_sessions"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "steps" ADD CONSTRAINT "steps_agentId_agents_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_session_idx" ON "conversations" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_status_idx" ON "conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_timeframe_idx" ON "conversations" USING btree ("startedAt","endedAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_conversation_idx" ON "messages" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_type_role_idx" ON "messages" USING btree ("type","role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_order_idx" ON "messages" USING btree ("orderIndex");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_step_idx" ON "messages" USING btree ("stepId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_parent_idx" ON "messages" USING btree ("parentMessageId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_created_at_idx" ON "messages" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "steps_agentId_idx" ON "steps" USING btree ("agentId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "steps_order_idx" ON "steps" USING btree ("orderIndex");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "steps_completed_idx" ON "steps" USING btree ("completed");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agents_site_published_idx" ON "agents" USING btree ("siteId","published");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_sessions_agentId_idx" ON "onboarding_sessions" USING btree ("agentId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_sessions_userId_idx" ON "onboarding_sessions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_sessions_clientIdentifier_idx" ON "onboarding_sessions" USING btree ("clientIdentifier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_sessions_status_idx" ON "onboarding_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_sessions_agent_user_status_idx" ON "onboarding_sessions" USING btree ("agentId","userId","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sites_subdomain_idx" ON "sites" USING btree ("subdomain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sites_subdomain_user_idx" ON "sites" USING btree ("subdomain","userId");