-- Create webglass_kanban table
CREATE TABLE IF NOT EXISTS webglass_kanban (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    phone text,
    step integer,
    name text,
    email text,
    role text,
    last_message_id text,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    kanban_step integer DEFAULT 0,
    avatar text,
    PRIMARY KEY(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS webglass_kanban_phone_unique ON public.webglass_kanban USING btree (phone);
