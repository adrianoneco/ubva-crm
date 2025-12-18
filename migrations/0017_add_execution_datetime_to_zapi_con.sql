-- Add execution_datetime to zapi_cron as timestamptz
ALTER TABLE zapi_cron
  ADD COLUMN IF NOT EXISTS execution_datetime timestamp with time zone;
