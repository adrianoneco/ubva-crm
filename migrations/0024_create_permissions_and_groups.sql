-- Create groups table
CREATE TABLE IF NOT EXISTS "groups" (
	"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL UNIQUE,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS "permissions" (
	"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"key" varchar(100) NOT NULL UNIQUE,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create group_permissions join table
CREATE TABLE IF NOT EXISTS "group_permissions" (
	"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"group_id" text NOT NULL,
	"permission_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_permissions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE,
	CONSTRAINT "group_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
);

-- Create user_groups join table
CREATE TABLE IF NOT EXISTS "user_groups" (
	"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"group_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
	CONSTRAINT "user_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE
);

-- Create user_permission_overrides table
CREATE TABLE IF NOT EXISTS "user_permission_overrides" (
	"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"permission_id" text NOT NULL,
	"granted" boolean NOT NULL DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_permission_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
	CONSTRAINT "user_permission_overrides_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_group_permissions_group_id" ON "group_permissions" ("group_id");
CREATE INDEX IF NOT EXISTS "idx_group_permissions_permission_id" ON "group_permissions" ("permission_id");
CREATE INDEX IF NOT EXISTS "idx_user_groups_user_id" ON "user_groups" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_groups_group_id" ON "user_groups" ("group_id");
CREATE INDEX IF NOT EXISTS "idx_user_permission_overrides_user_id" ON "user_permission_overrides" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_permission_overrides_permission_id" ON "user_permission_overrides" ("permission_id");

-- Insert default permissions if not already present
INSERT INTO "permissions" ("key", "name", "category") VALUES
-- Leads
('leads.view', 'Visualizar leads', 'Leads'),
('leads.create', 'Criar leads', 'Leads'),
('leads.edit', 'Editar leads', 'Leads'),
('leads.delete', 'Deletar leads', 'Leads'),
-- Contacts
('contacts.view', 'Visualizar contatos', 'Contatos'),
('contacts.create', 'Criar contatos', 'Contatos'),
('contacts.edit', 'Editar contatos', 'Contatos'),
('contacts.delete', 'Deletar contatos', 'Contatos'),
-- Appointments
('appointments.view', 'Visualizar agendamentos', 'Agendamentos'),
('appointments.create', 'Criar agendamentos', 'Agendamentos'),
('appointments.edit', 'Editar agendamentos', 'Agendamentos'),
('appointments.delete', 'Deletar agendamentos', 'Agendamentos'),
-- Campaigns
('campaigns.view', 'Visualizar campanhas', 'Campanhas'),
('campaigns.create', 'Criar campanhas', 'Campanhas'),
('campaigns.edit', 'Editar campanhas', 'Campanhas'),
('campaigns.execute', 'Executar campanhas', 'Campanhas'),
-- Settings
('settings.view', 'Acessar configurações', 'Configurações'),
('settings.manage_users', 'Gerenciar usuários', 'Configurações'),
('settings.manage_groups', 'Gerenciar grupos', 'Configurações'),
('settings.manage_webhooks', 'Gerenciar webhooks', 'Configurações')
ON CONFLICT ("key") DO NOTHING;

-- Insert default groups and assign permissions
DO $$ 
DECLARE
  admin_group_id text;
  manager_group_id text;
  user_group_id text;
BEGIN
  -- Insert Administrador group
  INSERT INTO "groups" ("name", "description") 
  VALUES ('Administrador', 'Acesso total ao sistema')
  ON CONFLICT ("name") DO NOTHING
  RETURNING "id" INTO admin_group_id;
  
  -- If INSERT returned NULL, get existing group ID
  IF admin_group_id IS NULL THEN
    SELECT "id" INTO admin_group_id FROM "groups" WHERE "name" = 'Administrador';
  END IF;
  
  -- Insert Gerente group
  INSERT INTO "groups" ("name", "description") 
  VALUES ('Gerente', 'Acesso a recursos de gerenciamento')
  ON CONFLICT ("name") DO NOTHING
  RETURNING "id" INTO manager_group_id;
  
  IF manager_group_id IS NULL THEN
    SELECT "id" INTO manager_group_id FROM "groups" WHERE "name" = 'Gerente';
  END IF;
  
  -- Insert Usuario group
  INSERT INTO "groups" ("name", "description") 
  VALUES ('Usuario', 'Acesso básico ao sistema')
  ON CONFLICT ("name") DO NOTHING
  RETURNING "id" INTO user_group_id;
  
  IF user_group_id IS NULL THEN
    SELECT "id" INTO user_group_id FROM "groups" WHERE "name" = 'Usuario';
  END IF;
  
  -- Assign ALL permissions to Administrador group
  INSERT INTO "group_permissions" ("group_id", "permission_id")
  SELECT admin_group_id, "id" FROM "permissions"
  ON CONFLICT DO NOTHING;
  
  -- Assign Gerente permissions (view/create/edit, no delete)
  INSERT INTO "group_permissions" ("group_id", "permission_id")
  SELECT manager_group_id, "id" FROM "permissions" 
  WHERE "key" IN (
    'leads.view', 'leads.create', 'leads.edit',
    'contacts.view', 'contacts.create', 'contacts.edit',
    'appointments.view', 'appointments.create', 'appointments.edit',
    'campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.execute',
    'settings.view', 'settings.manage_users'
  )
  ON CONFLICT DO NOTHING;
  
  -- Assign Usuario permissions (view/create only)
  INSERT INTO "group_permissions" ("group_id", "permission_id")
  SELECT user_group_id, "id" FROM "permissions" 
  WHERE "key" IN (
    'leads.view', 'leads.create',
    'contacts.view', 'contacts.create',
    'appointments.view', 'appointments.create',
    'campaigns.view',
    'settings.view'
  )
  ON CONFLICT DO NOTHING;
END $$;
