ALTER TABLE "system_logs" ALTER COLUMN "id" SET DEFAULT 'oghjmso84fj8tvrh0j12cowc';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripeCustomerId" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripeSubscriptionId" text;