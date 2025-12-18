-- Add agendamento_id column to webglass_bot table
ALTER TABLE webglass_bot ADD COLUMN agendamento_id text;

-- Add foreign key constraint
ALTER TABLE webglass_bot ADD CONSTRAINT webglass_bot_agendamento_id_fkey 
FOREIGN KEY (agendamento_id) REFERENCES appointments(id) ON DELETE SET NULL;
