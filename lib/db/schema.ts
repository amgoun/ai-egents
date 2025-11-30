import { pgTable, serial, text, timestamp, boolean, integer, jsonb, varchar, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { relations } from "drizzle-orm"

// Enums
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'canceled', 'past_due', 'unpaid'])
export const agentVisibilityEnum = pgEnum('agent_visibility', ['public', 'private'])
export const roleEnum = pgEnum('role', ['user', 'admin'])
export const resourceStatusEnum = pgEnum('resource_status', ['pending', 'processed', 'failed'])
export const modelProviderEnum = pgEnum('model_provider', ['OpenAI', 'Anthropic'])
export const modelVersionEnum = pgEnum('model_version', ['gpt-4o-mini', 'gpt-4o', 'claude-3.5-sonnet', 'claude-3.7-sonnet'])
export const resourceTypeEnum = pgEnum('resource_type', ['avatar', 'training_data', 'other'])

// Enable pgvector extension
export const enableVectorExtension = sql`CREATE EXTENSION IF NOT EXISTS vector;`

// Agent Training Data with Vector Support
export const agentTrainingData = pgTable("agent_training_data", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // pdf, txt, doc, etc.
  content: text("content").notNull(),
  // Store text chunks for context retrieval
  chunks: text("chunks").array(),
  // Store embeddings as vectors
  embedding: text("embedding"), // Will be cast to vector(1536) in migration
  status: resourceStatusEnum("status").default('pending').notNull(),
  metadata: jsonb("metadata"), // Additional metadata about the document
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Create vector column and index in a separate migration
export const setupVectorColumn = sql`
  -- Alter the embedding column to be a vector
  ALTER TABLE agent_training_data 
  ALTER COLUMN embedding TYPE vector(1536) 
  USING embedding::vector(1536);

  -- Create an index for faster similarity searches
  CREATE INDEX IF NOT EXISTS agent_training_data_embedding_idx 
  ON agent_training_data 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
`

// Function to match similar content using cosine similarity
export const createMatchFunction = sql`
CREATE OR REPLACE FUNCTION match_agent_content (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  agent_id bigint
)
RETURNS TABLE (
  id bigint,
  agent_id bigint,
  content text,
  chunk text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    td.id,
    td.agent_id,
    td.content,
    unnest(td.chunks) as chunk,
    1 - (td.embedding <=> query_embedding) as similarity
  FROM agent_training_data td
  WHERE 1 - (td.embedding <=> query_embedding) > match_threshold
    AND td.agent_id = match_agent_content.agent_id
  ORDER BY td.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;`

// Users table
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Supabase user id
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  role: roleEnum('role').default('user').notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Subscriptions table (Stripe)
export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  status: subscriptionStatusEnum('status').notNull(),
  priceId: text("price_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").unique().notNull(),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Agent Resources table
export const agentResources = pgTable("agent_resources", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id"), // Will be referenced in relations
  type: resourceTypeEnum("type").notNull(),
  name: text("name").notNull(),
  size: integer("size").notNull(),
  mimeType: text("mime_type").notNull(),
  storagePath: text("storage_path").notNull(),
  publicUrl: text("public_url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// AI Agents table
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  // Avatar fields with constraints
  avatarUrl: text("avatar_url"),
  avatarPath: text("avatar_path").unique(), // Ensure unique storage paths
  avatarResourceId: integer("avatar_resource_id").references(() => agentResources.id), // Link to resource record
  imageDescription: text("image_description"), // For AI avatar generation
  visibility: agentVisibilityEnum('visibility').default('public').notNull(),
  // Basic Info
  universe: text("universe").notNull(), // The agent's universe/context
  topicExpertise: text("topic_expertise").notNull(), // Comma-separated expertise areas
  
  // AI Model Configuration
  modelProvider: modelProviderEnum("model_provider").default('OpenAI').notNull(),
  modelVersion: modelVersionEnum("model_version").notNull(), // e.g., 'gpt-4o-mini', 'claude-3.5-sonnet'
  temperature: integer("temperature").default(70), // 0-100 scale for response randomness
  systemPrompt: text("system_prompt").notNull(),
  
  // Creator & Status
  creatorId: text("creator_id").references(() => users.id),
  isVerified: boolean("is_verified").default(false),
  
  // Additional Configuration
  metadata: jsonb("metadata"), // Store any additional agent configuration
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Add the reference after both tables are defined
export const agentResourceRelations = relations(agentResources, ({ one }) => ({
  agent: one(agents, {
    fields: [agentResources.agentId],
    references: [agents.id],
  }),
}))

// Chat Sessions
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  // Allow userId to be null for guest/embedded sessions
  userId: text("user_id").references(() => users.id),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  title: text("title"),
  // Add visitor_id for tracking anonymous users
  visitorId: text("visitor_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Chat Messages
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => chatSessions.id).notNull(),
  content: text("content").notNull(),
  role: text("role").notNull(), // user, assistant
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Usage Limits
export const usageLimits = pgTable("usage_limits", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  messageCount: integer("message_count").default(0).notNull(),
  agentCount: integer("agent_count").default(0).notNull(),
  tokensUsed: integer("tokens_used").default(0).notNull(), // Track token usage
  tokensLimit: integer("tokens_limit").default(250000).notNull(), // Default 250K tokens for free users
  planType: text("plan_type").default('free').notNull(), // 'free', 'pro'
  avatarsGenerated: integer("avatars_generated").default(0).notNull(), // Track AI avatar generations
  avatarsLimit: integer("avatars_limit").default(5).notNull(), // Default 5 avatars for free, 50 for pro
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Token Usage Tracking - detailed log of each API call
export const tokenUsage = pgTable("token_usage", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  sessionId: integer("session_id").references(() => chatSessions.id),
  agentId: integer("agent_id").references(() => agents.id),
  messageId: integer("message_id").references(() => chatMessages.id),
  tokensUsed: integer("tokens_used").notNull(),
  modelUsed: text("model_used").notNull(), // gpt-4o-mini, claude-3.5-sonnet, etc.
  operationType: text("operation_type").notNull(), // 'chat', 'agent_creation', 'avatar_generation'
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Define all relations in one place
export const userRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  agents: many(agents),
  chatSessions: many(chatSessions),
  usageLimits: many(usageLimits),
  tokenUsage: many(tokenUsage),
}))

export const agentRelations = relations(agents, ({ one, many }) => ({
  creator: one(users, {
    fields: [agents.creatorId],
    references: [users.id],
  }),
  avatar: one(agentResources, {
    fields: [agents.avatarResourceId],
    references: [agentResources.id],
  }),
  resources: many(agentResources),
  trainingData: many(agentTrainingData),
  chatSessions: many(chatSessions),
}))

export const resourceRelations = relations(agentResources, ({ one }) => ({
  agent: one(agents, {
    fields: [agentResources.agentId],
    references: [agents.id],
  }),
}))

export const chatSessionRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  agent: one(agents, {
    fields: [chatSessions.agentId],
    references: [agents.id],
  }),
  messages: many(chatMessages),
  tokenUsage: many(tokenUsage),
}))

export const tokenUsageRelations = relations(tokenUsage, ({ one }) => ({
  user: one(users, {
    fields: [tokenUsage.userId],
    references: [users.id],
  }),
  session: one(chatSessions, {
    fields: [tokenUsage.sessionId],
    references: [chatSessions.id],
  }),
  agent: one(agents, {
    fields: [tokenUsage.agentId],
    references: [agents.id],
  }),
  message: one(chatMessages, {
    fields: [tokenUsage.messageId],
    references: [chatMessages.id],
  }),
}))

// Export types
export type User = typeof users.$inferSelect
export type Subscription = typeof subscriptions.$inferSelect
export type Agent = typeof agents.$inferSelect
export type AgentResource = typeof agentResources.$inferSelect
export type AgentTrainingData = typeof agentTrainingData.$inferSelect
export type ChatSession = typeof chatSessions.$inferSelect
export type ChatMessage = typeof chatMessages.$inferSelect
export type UsageLimit = typeof usageLimits.$inferSelect
export type TokenUsage = typeof tokenUsage.$inferSelect
