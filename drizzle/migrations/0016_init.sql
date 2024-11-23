CREATE TABLE IF NOT EXISTS "organization_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
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
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" RENAME COLUMN "userId" TO "createdBy";--> statement-breakpoint
ALTER TABLE "sites" RENAME COLUMN "userId" TO "createdBy";--> statement-breakpoint
ALTER TABLE "agents" DROP CONSTRAINT "agents_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "sites" DROP CONSTRAINT "sites_userId_users_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "agents_userId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "sites_userId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "sites_subdomain_user_idx";--> statement-breakpoint
ALTER TABLE "sites" ALTER COLUMN "createdBy" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "system_logs" ALTER COLUMN "id" SET DEFAULT 'gc5p8pkrnr0hgbkqtwyecxak';--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "organizationId" text NOT NULL;--> statement-breakpoint
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
 ALTER TABLE "organizations" ADD CONSTRAINT "organizations_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_memberships_org_user_idx" ON "organization_memberships" USING btree ("organizationId","userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_memberships_user_idx" ON "organization_memberships" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organizations_createdBy_idx" ON "organizations" USING btree ("createdBy");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agents" ADD CONSTRAINT "agents_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;
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
CREATE INDEX IF NOT EXISTS "agents_createdBy_idx" ON "agents" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sites_organization_idx" ON "sites" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sites_createdBy_idx" ON "sites" USING btree ("createdBy");