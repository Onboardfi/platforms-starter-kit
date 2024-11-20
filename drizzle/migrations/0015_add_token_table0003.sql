ALTER TABLE "system_logs" ALTER COLUMN "id" SET DEFAULT 'luqrkgmls993gvua81di176o';--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN "promptTokens" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN "completionTokens" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN "totalTokens" integer DEFAULT 0;