CREATE TABLE IF NOT EXISTS "onboarding_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"agentId" text,
	"userId" text,
	"name" text,
	"clientIdentifier" text,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"stepProgress" jsonb,
	"metadata" jsonb,
	"lastInteractionAt" timestamp,
	"startedAt" timestamp DEFAULT now(),
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_agentId_agents_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
