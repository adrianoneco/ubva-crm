-- Create broadcast lists and join table
CREATE TABLE IF NOT EXISTS broadcast_lists (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS broadcast_list_contacts (
  id SERIAL PRIMARY KEY,
  list_id INTEGER NOT NULL REFERENCES broadcast_lists(id) ON DELETE CASCADE,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE
);
