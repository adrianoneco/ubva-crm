-- Add country and whatsapp_profile_fetch columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone_country VARCHAR(2) DEFAULT 'BR',
ADD COLUMN IF NOT EXISTS phone_formatted VARCHAR(20),
ADD COLUMN IF NOT EXISTS fetch_whatsapp_profile INTEGER DEFAULT 0;

-- Add profile_picture_url to webglass_bot
ALTER TABLE webglass_bot
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
