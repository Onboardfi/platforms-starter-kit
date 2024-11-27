ALTER TABLE "system_logs" ALTER COLUMN "id" SET DEFAULT 'i1hrhvwhkdmrl3oczu85cp3d';--> statement-breakpoint
ALTER TABLE "usage_logs" ALTER COLUMN "promptTokens" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_logs" ALTER COLUMN "completionTokens" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_logs" ALTER COLUMN "totalTokens" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_logs" ALTER COLUMN "reportingStatus" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN "organizationId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_organization_idx" ON "usage_logs" USING btree ("organizationId");