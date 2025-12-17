-- Convert users.id and broadcast_list_contacts.id to UUIDs using gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- 1) Add new uuid columns with defaults
ALTER TABLE users ADD COLUMN id_new uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE broadcast_list_contacts ADD COLUMN id_new uuid DEFAULT gen_random_uuid() NOT NULL;

-- 2) Populate id_new for existing rows (defaults already applied)
UPDATE users SET id_new = gen_random_uuid() WHERE id_new IS NULL;
UPDATE broadcast_list_contacts SET id_new = gen_random_uuid() WHERE id_new IS NULL;

-- 3) Drop primary key constraints
ALTER TABLE users DROP CONSTRAINT users_pkey;
ALTER TABLE broadcast_list_contacts DROP CONSTRAINT broadcast_list_contacts_pkey;

-- 4) Drop old id columns and rename new ones
ALTER TABLE users DROP COLUMN id;
ALTER TABLE users RENAME COLUMN id_new TO id;
ALTER TABLE users ALTER COLUMN id SET NOT NULL;
ALTER TABLE users ADD PRIMARY KEY (id);

ALTER TABLE broadcast_list_contacts DROP COLUMN id;
ALTER TABLE broadcast_list_contacts RENAME COLUMN id_new TO id;
ALTER TABLE broadcast_list_contacts ALTER COLUMN id SET NOT NULL;
ALTER TABLE broadcast_list_contacts ADD PRIMARY KEY (id);

COMMIT;
