-- Ensure no NULL phones and enforce uniqueness + not null
-- 1) Normalize existing NULLs to a unique placeholder using the id
UPDATE webglass_bot SET phone = 'unknown-' || id WHERE phone IS NULL;

-- 2) Create unique index if it does not exist
CREATE UNIQUE INDEX IF NOT EXISTS webglass_bot_phone_unique ON public.webglass_bot USING btree (phone);

-- 3) Set the column to NOT NULL
ALTER TABLE webglass_bot ALTER COLUMN phone SET NOT NULL;
