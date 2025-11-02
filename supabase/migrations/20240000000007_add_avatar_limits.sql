-- Migration: Add avatar generation limits to usage_limits table
-- This adds tracking for AI-generated avatars with monthly limits

-- Add avatar tracking columns to usage_limits
ALTER TABLE usage_limits 
ADD COLUMN IF NOT EXISTS avatars_generated INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS avatars_limit INTEGER DEFAULT 5 NOT NULL;

-- Update existing Pro users to have 50 avatar limit
UPDATE usage_limits 
SET avatars_limit = 50 
WHERE plan_type = 'pro';

-- Update existing Free users to have 5 avatar limit (already default)
UPDATE usage_limits 
SET avatars_limit = 5 
WHERE plan_type = 'free';

-- Add comment for documentation
COMMENT ON COLUMN usage_limits.avatars_generated IS 'Number of AI avatars generated this period';
COMMENT ON COLUMN usage_limits.avatars_limit IS 'Maximum AI avatars allowed per period (5 for free, 50 for pro)';

