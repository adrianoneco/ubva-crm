-- Migration: add platform column to webglass_bot
ALTER TABLE webglass_bot
  ADD COLUMN IF NOT EXISTS platform text;

-- Optional: set a default value for existing rows (uncomment if desired)
-- UPDATE webglass_bot SET platform = 'web' WHERE platform IS NULL;
