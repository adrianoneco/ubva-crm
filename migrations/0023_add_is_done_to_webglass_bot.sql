-- Add is_done column to webglass_bot table (default false)
ALTER TABLE webglass_bot
  ADD COLUMN IF NOT EXISTS is_done boolean NOT NULL DEFAULT false;
