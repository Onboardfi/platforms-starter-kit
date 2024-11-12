ALTER TABLE "usage_logs" DROP CONSTRAINT "usage_logs_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "usage_logs" DROP CONSTRAINT "usage_logs_sessionId_onboarding_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "usage_logs" DROP CONSTRAINT "usage_logs_conversationId_conversations_id_fk";
--> statement-breakpoint
ALTER TABLE "usage_logs" DROP CONSTRAINT "usage_logs_messageId_messages_id_fk";
--> statement-breakpoint
ALTER TABLE "system_logs" ALTER COLUMN "id" SET DEFAULT 'x2eg33ny0padbqqcjaakgo9r';--> statement-breakpoint
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
