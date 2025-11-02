-- Migration: Update model_version enum to use GPT-4o-mini instead of GPT-4
-- This migration updates the model_version enum type to support the new GPT-4o models

-- Step 1: Add new enum values
ALTER TYPE model_version ADD VALUE IF NOT EXISTS 'gpt-4o-mini';
ALTER TYPE model_version ADD VALUE IF NOT EXISTS 'gpt-4o';

-- Step 2: Update existing agents using old GPT-4 models to use GPT-4o-mini
UPDATE agents 
SET model_version = 'gpt-4o-mini' 
WHERE model_version IN ('gpt-4', 'gpt-4.1');

-- Step 3: Update token_usage records to reflect the new model names
UPDATE token_usage 
SET model_used = 'gpt-4o-mini' 
WHERE model_used IN ('gpt-4', 'gpt-4.1');

-- Note: We cannot remove old enum values ('gpt-4', 'gpt-4.1') without recreating the enum type
-- This is safe - the old values will remain in the enum but won't be used
-- If you want to fully remove them, you would need to:
-- 1. Create a new enum type
-- 2. Alter all columns to use the new type
-- 3. Drop the old enum type
-- This is not necessary for functionality and can be done later if needed

