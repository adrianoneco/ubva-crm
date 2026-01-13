-- Add nome_fantasia column to webglass_bot
ALTER TABLE webglass_bot
  ADD COLUMN IF NOT EXISTS nome_fantasia text;
