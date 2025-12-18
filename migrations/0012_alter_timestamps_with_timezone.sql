-- Alterar colunas de timestamp para timestamp with time zone
ALTER TABLE appointments ALTER COLUMN date_time TYPE timestamp with time zone;
ALTER TABLE appointments ALTER COLUMN created_at TYPE timestamp with time zone;

ALTER TABLE users ALTER COLUMN created_at TYPE timestamp with time zone;

ALTER TABLE webglass_bot ALTER COLUMN created_at TYPE timestamp with time zone;

ALTER TABLE contacts ALTER COLUMN created_at TYPE timestamp with time zone;
ALTER TABLE contacts ALTER COLUMN updated_at TYPE timestamp with time zone;

ALTER TABLE broadcast_lists ALTER COLUMN created_at TYPE timestamp with time zone;
