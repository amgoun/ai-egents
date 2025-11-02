ALTER TABLE "agents" ALTER COLUMN "model_version" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."model_version";--> statement-breakpoint
CREATE TYPE "public"."model_version" AS ENUM('gpt-4o-mini', 'gpt-4o', 'claude-3.5-sonnet', 'claude-3.7-sonnet');--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "model_version" SET DATA TYPE "public"."model_version" USING "model_version"::"public"."model_version";--> statement-breakpoint
ALTER TABLE "usage_limits" ADD COLUMN "avatars_generated" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_limits" ADD COLUMN "avatars_limit" integer DEFAULT 5 NOT NULL;