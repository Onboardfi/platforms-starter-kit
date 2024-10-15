ALTER TABLE "agents" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "imageBlurhash" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agents_slug_siteId_index" ON "agents" USING btree ("slug","siteId");