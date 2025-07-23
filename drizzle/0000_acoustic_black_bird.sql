CREATE TYPE "public"."agent_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."model_provider" AS ENUM('OpenAI', 'Anthropic');--> statement-breakpoint
CREATE TYPE "public"."model_version" AS ENUM('gpt-4', 'gpt-4.1', 'claude-3.5-sonnet', 'claude-3.7-sonnet');--> statement-breakpoint
CREATE TYPE "public"."resource_status" AS ENUM('pending', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('avatar', 'training_data', 'other');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due', 'unpaid');--> statement-breakpoint
CREATE TABLE "agent_resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer,
	"type" "resource_type" NOT NULL,
	"name" text NOT NULL,
	"size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"storage_path" text NOT NULL,
	"public_url" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_training_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"content" text NOT NULL,
	"chunks" text[],
	"embedding" text,
	"status" "resource_status" DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"avatar_url" text,
	"avatar_path" text,
	"avatar_resource_id" integer,
	"image_description" text,
	"visibility" "agent_visibility" DEFAULT 'public' NOT NULL,
	"universe" text NOT NULL,
	"topic_expertise" text NOT NULL,
	"model_provider" "model_provider" DEFAULT 'OpenAI' NOT NULL,
	"model_version" "model_version" NOT NULL,
	"temperature" integer DEFAULT 70,
	"system_prompt" text NOT NULL,
	"creator_id" text,
	"is_verified" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agents_avatar_path_unique" UNIQUE("avatar_path")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"content" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"agent_id" integer NOT NULL,
	"title" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" "subscription_status" NOT NULL,
	"price_id" text NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "usage_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"agent_count" integer DEFAULT 0 NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"role" "role" DEFAULT 'user' NOT NULL,
	"stripe_customer_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "agent_training_data" ADD CONSTRAINT "agent_training_data_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_avatar_resource_id_agent_resources_id_fk" FOREIGN KEY ("avatar_resource_id") REFERENCES "public"."agent_resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_limits" ADD CONSTRAINT "usage_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;