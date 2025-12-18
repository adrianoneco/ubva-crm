-- Alter appointments.date_time to timestamp with time zone
-- This assumes existing values are stored in UTC. Adjust the USING clause if stored in a different timezone.
ALTER TABLE appointments
  ALTER COLUMN date_time TYPE timestamp with time zone
  USING date_time AT TIME ZONE 'UTC';

-- Ensure index constraints still apply (partial unique index for agendado exists in migration 0014)
