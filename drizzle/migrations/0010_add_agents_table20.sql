CREATE TABLE IF NOT EXISTS "system_logs" (
	"id" text PRIMARY KEY DEFAULT 'xwml43wg6tkk2nd4o8kvr1yq' NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"source" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_logs_type_idx" ON "system_logs" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_logs_created_at_idx" ON "system_logs" USING btree ("createdAt");