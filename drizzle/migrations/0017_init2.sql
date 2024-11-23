ALTER TABLE "posts" RENAME COLUMN "userId" TO "createdBy";--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_userId_users_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "posts_userId_idx";--> statement-breakpoint
ALTER TABLE "system_logs" ALTER COLUMN "id" SET DEFAULT 'qhcjjo9porguaxytp86of0qy';--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD COLUMN "organizationId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "organizationId" text NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
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
CREATE INDEX IF NOT EXISTS "onboarding_sessions_organization_idx" ON "onboarding_sessions" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_createdBy_idx" ON "posts" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_organization_idx" ON "posts" USING btree ("organizationId");