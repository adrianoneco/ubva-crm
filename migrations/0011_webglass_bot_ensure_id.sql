-- Ensure webglass_bot.id is populated: fill null/empty, add default, and trigger
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- Fill existing NULL or empty ids
UPDATE webglass_bot SET id = gen_random_uuid() WHERE id IS NULL OR id = '';

-- Ensure default exists
ALTER TABLE webglass_bot ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Create function to set id when missing
CREATE OR REPLACE FUNCTION ensure_webglass_bot_id() RETURNS trigger AS $$
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    NEW.id := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert
DROP TRIGGER IF EXISTS trg_ensure_webglass_bot_id ON webglass_bot;
CREATE TRIGGER trg_ensure_webglass_bot_id
BEFORE INSERT ON webglass_bot
FOR EACH ROW
EXECUTE FUNCTION ensure_webglass_bot_id();

COMMIT;
