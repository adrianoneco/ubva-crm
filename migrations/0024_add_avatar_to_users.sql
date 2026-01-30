-- Add avatar field to users table for WhatsApp profile pictures
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
