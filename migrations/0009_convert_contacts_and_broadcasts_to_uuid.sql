-- Enable pgcrypto for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- 1) Add new uuid columns with defaults
ALTER TABLE contacts ADD COLUMN id_new uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE broadcast_lists ADD COLUMN id_new uuid DEFAULT gen_random_uuid() NOT NULL;

-- 2) Add new fk columns to linking table
ALTER TABLE broadcast_list_contacts ADD COLUMN contact_id_new uuid;
ALTER TABLE broadcast_list_contacts ADD COLUMN list_id_new uuid;

-- 3) Populate fk columns by joining existing ids
UPDATE broadcast_list_contacts blc SET contact_id_new = c.id_new FROM contacts c WHERE blc.contact_id = c.id;
UPDATE broadcast_list_contacts blc SET list_id_new = bl.id_new FROM broadcast_lists bl WHERE blc.list_id = bl.id;

-- 4) Drop old fk columns and rename new ones
ALTER TABLE broadcast_list_contacts DROP COLUMN contact_id;
ALTER TABLE broadcast_list_contacts DROP COLUMN list_id;
ALTER TABLE broadcast_list_contacts RENAME COLUMN contact_id_new TO contact_id;
ALTER TABLE broadcast_list_contacts RENAME COLUMN list_id_new TO list_id;

-- 5) Replace primary keys on parent tables
ALTER TABLE contacts DROP CONSTRAINT contacts_pkey;
ALTER TABLE contacts DROP COLUMN id;
ALTER TABLE contacts RENAME COLUMN id_new TO id;
ALTER TABLE contacts ALTER COLUMN id SET NOT NULL;
ALTER TABLE contacts ADD PRIMARY KEY (id);

ALTER TABLE broadcast_lists DROP CONSTRAINT broadcast_lists_pkey;
ALTER TABLE broadcast_lists DROP COLUMN id;
ALTER TABLE broadcast_lists RENAME COLUMN id_new TO id;
ALTER TABLE broadcast_lists ALTER COLUMN id SET NOT NULL;
ALTER TABLE broadcast_lists ADD PRIMARY KEY (id);

-- 6) Ensure linking table columns are NOT NULL (if desired)
ALTER TABLE broadcast_list_contacts ALTER COLUMN contact_id SET NOT NULL;
ALTER TABLE broadcast_list_contacts ALTER COLUMN list_id SET NOT NULL;

COMMIT;
