-- Add feedback column to webglass_bot
ALTER TABLE webglass_bot
  ADD COLUMN IF NOT EXISTS feedback text;