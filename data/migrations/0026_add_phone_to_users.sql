-- Add phone and phone_country columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS phone_country VARCHAR(2) DEFAULT 'BR';

-- Create index on phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
