-- Add contacts jsonb column to broadcast_lists
ALTER TABLE broadcast_lists
ADD COLUMN IF NOT EXISTS contacts jsonb NOT NULL DEFAULT '[]'::jsonb;
