CREATE TABLE IF NOT EXISTS "organization_integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"provider" text NOT NULL,
	"accessToken" text,
	"tokenType" text,
	"scope" text,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "system_logs" ALTER COLUMN "id" SET DEFAULT 'yw0wn9ep4q38xeouj9hux2mx';--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_integrations" ADD CONSTRAINT "organization_integrations_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_integrations_provider_idx" ON "organization_integrations" USING btree ("provider");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_integrations_org_provider_idx" ON "organization_integrations" USING btree ("organizationId","provider");