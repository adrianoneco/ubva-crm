-- 0016: alter default duration_minutes to 60 and create zapi_cron table

ALTER TABLE appointments
  ALTER COLUMN duration_minutes SET DEFAULT 60;

CREATE TABLE IF NOT EXISTS zapi_cron (
  id text NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module varchar(255) NOT NULL,
  payload text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
