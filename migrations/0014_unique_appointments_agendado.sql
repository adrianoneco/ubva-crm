-- Create unique partial index to prevent multiple 'agendado' appointments at same datetime
CREATE UNIQUE INDEX IF NOT EXISTS unique_appointments_agendado_datetime
ON appointments (date_time)
WHERE status = 'agendado';
