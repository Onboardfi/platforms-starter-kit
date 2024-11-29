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
ALTER TABLE "system_logs" ALTER COLUMN "id" SET DEFAULT 'k30habqwsnaduuoibkm47n9g';--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feature_access_events" ADD CONSTRAINT "feature_access_events_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "subscription_feature_usage" ADD CONSTRAINT "subscription_feature_usage_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_tier_usage_org_idx" ON "organization_tier_usage" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_tier_usage_period_idx" ON "organization_tier_usage" USING btree ("billingPeriodStart","billingPeriodEnd");