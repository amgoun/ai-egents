-- Verify Migration Success
-- Run this in Supabase SQL Editor to confirm everything is working

-- 1. Check new model_version enum values
SELECT 'Model Versions Available:' as check_type;
SELECT unnest(enum_range(NULL::model_version)) as available_models;

-- 2. Check avatar columns exist
SELECT 'Avatar Columns Check:' as check_type;
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'usage_limits' 
  AND column_name IN ('avatars_generated', 'avatars_limit');

-- 3. Check existing agents updated
SELECT 'Agents Model Distribution:' as check_type;
SELECT model_version, COUNT(*) as count 
FROM agents 
GROUP BY model_version;

-- 4. Check usage_limits avatar limits by plan
SELECT 'Avatar Limits by Plan:' as check_type;
SELECT plan_type, avatars_limit, COUNT(*) as users
FROM usage_limits
GROUP BY plan_type, avatars_limit;

-- 5. Sample usage_limits data
SELECT 'Sample Usage Limits:' as check_type;
SELECT 
  plan_type,
  tokens_used,
  tokens_limit,
  avatars_generated,
  avatars_limit
FROM usage_limits
LIMIT 5;

SELECT '✅ All checks complete!' as status;

