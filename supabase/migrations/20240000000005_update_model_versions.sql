-- Create model_version enum
CREATE TYPE model_version AS ENUM ('gpt-4', 'gpt-4.1', 'claude-3.5-sonnet', 'claude-3.7-sonnet');

-- Add model_version column and drop model_name
ALTER TABLE agents
  ADD COLUMN model_version model_version;

-- Update existing records
UPDATE agents
  SET model_version = CASE
    WHEN model_name LIKE '%gpt-4%' THEN 'gpt-4'::model_version
    WHEN model_name LIKE '%claude%' THEN 'claude-3.5-sonnet'::model_version
    ELSE 'gpt-4'::model_version
  END;

-- Make model_version not null
ALTER TABLE agents
  ALTER COLUMN model_version SET NOT NULL;

-- Drop old model_name column
ALTER TABLE agents
  DROP COLUMN model_name; 