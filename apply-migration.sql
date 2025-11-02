-- Apply Drizzle Migration: Update model versions and add avatar limits
-- Run this in your Supabase SQL Editor

-- Step 1: Temporarily change column to text (so we can drop the enum)
ALTER TABLE agents ALTER COLUMN model_version SET DATA TYPE text;

-- Step 2: Drop old enum
DROP TYPE IF EXISTS public.model_version;

-- Step 3: Create new enum with updated values
CREATE TYPE public.model_version AS ENUM('gpt-4o-mini', 'gpt-4o', 'claude-3.5-sonnet', 'claude-3.7-sonnet');

-- Step 4: Update existing agents to use new model names (while still text)
UPDATE agents 
SET model_version = 'gpt-4o-mini' 
WHERE model_version IN ('gpt-4', 'gpt-4.1');

-- Step 5: Convert column back to enum
ALTER TABLE agents ALTER COLUMN model_version SET DATA TYPE public.model_version USING model_version::public.model_version;

-- Step 6: Add avatar tracking columns
ALTER TABLE usage_limits ADD COLUMN IF NOT EXISTS avatars_generated integer DEFAULT 0 NOT NULL;
ALTER TABLE usage_limits ADD COLUMN IF NOT EXISTS avatars_limit integer DEFAULT 5 NOT NULL;

-- Step 7: Update existing Pro users to have 50 avatar limit
UPDATE usage_limits 
SET avatars_limit = 50 
WHERE plan_type = 'pro';

-- Step 8: Update token_usage records to reflect new model names
UPDATE token_usage 
SET model_used = 'gpt-4o-mini' 
WHERE model_used IN ('gpt-4', 'gpt-4.1');

-- Verify the changes
SELECT 'Migration completed successfully!' as status;

