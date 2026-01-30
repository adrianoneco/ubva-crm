-- Add profile_picture_url column to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
CREATE INDEX IF NOT EXISTS idx_contacts_profile_picture ON contacts(profile_picture_url);
