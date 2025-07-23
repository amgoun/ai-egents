-- Update model_provider enum to remove Custom option
ALTER TYPE model_provider RENAME TO model_provider_old;
CREATE TYPE model_provider AS ENUM ('OpenAI', 'Anthropic');

-- Convert existing values
ALTER TABLE agents
  ALTER COLUMN model_provider TYPE model_provider 
  USING (
    CASE 
      WHEN model_provider::text = 'Custom' THEN 'OpenAI'::model_provider 
      ELSE model_provider::text::model_provider 
    END
  );

-- Drop old type
DROP TYPE model_provider_old; 