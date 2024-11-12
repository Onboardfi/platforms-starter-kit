CREATE TABLE IF NOT EXISTS "usage_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"sessionId" text,
	"conversationId" text,
	"messageId" text,
	"durationSeconds" integer NOT NULL,
	"messageRole" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"stripeCustomerId" text,
	"stripeEventId" text,
	"reportingStatus" text DEFAULT 'pending'
);
--> statement-breakpoint
ALTER TABLE "system_logs" ALTER COLUMN "id" SET DEFAULT 'vy32tccnxgog8z4w2giw6xs0';--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_sessionId_onboarding_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."onboarding_sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_conversationId_conversations_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_messageId_messages_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_userId_idx" ON "usage_logs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_sessionId_idx" ON "usage_logs" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_conversationId_idx" ON "usage_logs" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_createdAt_idx" ON "usage_logs" USING btree ("createdAt");