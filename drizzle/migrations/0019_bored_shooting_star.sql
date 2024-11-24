ALTER TABLE "system_logs" ALTER COLUMN "id" SET DEFAULT 'x3x1lakk2da3g0m2a95pl4yd';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;