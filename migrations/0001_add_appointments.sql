-- Add appointments table
CREATE TABLE appointments(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text,
    date_time timestamp without time zone NOT NULL,
    duration_minutes integer NOT NULL DEFAULT 30,
    customer_name text,
    notes text,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'disponivel'::text,
    phone text,
    meet_link text,
    PRIMARY KEY(id)
);
