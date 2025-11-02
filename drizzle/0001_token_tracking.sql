-- Migration: Add token tracking support
-- This adds token tracking fields to usage_limits and creates the token_usage table

-- Add token tracking columns to usage_limits table
ALTER TABLE "usage_limits" 
ADD COLUMN "tokens_used" integer DEFAULT 0 NOT NULL,
ADD COLUMN "tokens_limit" integer DEFAULT 1000000 NOT NULL,
ADD COLUMN "plan_type" text DEFAULT 'free' NOT NULL;

-- Create token_usage table for detailed tracking
CREATE TABLE "token_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_id" integer,
	"agent_id" integer,
	"message_id" integer,
	"tokens_used" integer NOT NULL,
	"model_used" text NOT NULL,
	"operation_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints for token_usage table
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_message_id_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE no action ON UPDATE no action;

-- Create indexes for better query performance
CREATE INDEX "token_usage_user_id_idx" ON "token_usage" ("user_id");
CREATE INDEX "token_usage_created_at_idx" ON "token_usage" ("created_at");
CREATE INDEX "token_usage_operation_type_idx" ON "token_usage" ("operation_type");
CREATE INDEX "usage_limits_user_id_period_idx" ON "usage_limits" ("user_id", "period_end");

-- Initialize existing users with default usage limits if they don't have any
-- This ensures backward compatibility
INSERT INTO "usage_limits" (
  "user_id", 
  "message_count", 
  "agent_count", 
  "tokens_used", 
  "tokens_limit", 
  "plan_type",
  "period_start", 
  "period_end"
)
SELECT 
  u.id,
  0,
  0,
  0,
  1000000,
  'free',
  DATE_TRUNC('month', CURRENT_DATE),
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
FROM "users" u
WHERE NOT EXISTS (
  SELECT 1 FROM "usage_limits" ul 
  WHERE ul.user_id = u.id 
  AND ul.period_end > CURRENT_DATE
);

-- Comment explaining the schema
COMMENT ON TABLE "token_usage" IS 'Detailed log of token usage for each API call';
COMMENT ON COLUMN "token_usage"."operation_type" IS 'Type of operation: chat, agent_creation, avatar_generation';
COMMENT ON COLUMN "usage_limits"."tokens_used" IS 'Total tokens consumed in current period';
COMMENT ON COLUMN "usage_limits"."tokens_limit" IS 'Maximum tokens allowed for plan type';
COMMENT ON COLUMN "usage_limits"."plan_type" IS 'User plan: free, pro'; 