ALTER TABLE "verificationTokens" DROP CONSTRAINT "verificationTokens_token_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "accounts_userId_index";--> statement-breakpoint
DROP INDEX IF EXISTS "agents_siteId_index";--> statement-breakpoint
DROP INDEX IF EXISTS "agents_userId_index";--> statement-breakpoint
DROP INDEX IF EXISTS "agents_slug_siteId_index";--> statement-breakpoint
DROP INDEX IF EXISTS "posts_siteId_index";--> statement-breakpoint
DROP INDEX IF EXISTS "posts_userId_index";--> statement-breakpoint
DROP INDEX IF EXISTS "posts_slug_siteId_index";--> statement-breakpoint
DROP INDEX IF EXISTS "sessions_userId_index";--> statement-breakpoint
DROP INDEX IF EXISTS "sites_userId_index";--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "image" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "imageBlurhash" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "sites" ALTER COLUMN "logo" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sites" ALTER COLUMN "image" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sites" ALTER COLUMN "imageBlurhash" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sites" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_userId_idx" ON "accounts" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agents_siteId_idx" ON "agents" USING btree ("siteId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agents_userId_idx" ON "agents" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agents_slug_siteId_key" ON "agents" USING btree ("slug","siteId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_siteId_idx" ON "posts" USING btree ("siteId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_userId_idx" ON "posts" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "posts_slug_siteId_key" ON "posts" USING btree ("slug","siteId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_userId_idx" ON "sessions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sites_userId_idx" ON "sites" USING btree ("userId");