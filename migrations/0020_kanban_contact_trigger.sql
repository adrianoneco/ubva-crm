-- Trigger function to create/update contact when a kanban item is inserted or updated
CREATE OR REPLACE FUNCTION sync_kanban_to_contacts()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if phone is not null
    IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
        -- Insert or update contact using phone as the unique key
        INSERT INTO contacts (id, name, email, phone, company, is_whatsapp, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            COALESCE(NEW.name, 'Lead ' || NEW.phone),
            NEW.email,
            NEW.phone,
            NEW.nome_fantasia,
            1, -- is_whatsapp = true since it comes from kanban/whatsapp
            NOW(),
            NOW()
        )
        ON CONFLICT (phone) DO UPDATE SET
            name = COALESCE(EXCLUDED.name, contacts.name),
            email = COALESCE(EXCLUDED.email, contacts.email),
            company = COALESCE(EXCLUDED.company, contacts.company),
            is_whatsapp = 1,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create unique index on contacts.phone if not exists (needed for ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS contacts_phone_unique_idx ON contacts(phone) WHERE phone IS NOT NULL AND phone != '';

-- Drop trigger if exists to avoid conflicts
DROP TRIGGER IF EXISTS kanban_contact_sync_trigger ON webglass_bot;

-- Create trigger on webglass_bot table
CREATE TRIGGER kanban_contact_sync_trigger
    AFTER INSERT OR UPDATE ON webglass_bot
    FOR EACH ROW
    EXECUTE FUNCTION sync_kanban_to_contacts();

-- Sync existing kanban items to contacts
INSERT INTO contacts (id, name, email, phone, company, is_whatsapp, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    COALESCE(wb.name, 'Lead ' || wb.phone),
    wb.email,
    wb.phone,
    wb.nome_fantasia,
    1,
    COALESCE(wb.created_at, NOW()),
    NOW()
FROM webglass_bot wb
WHERE wb.phone IS NOT NULL AND wb.phone != ''
ON CONFLICT (phone) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, contacts.name),
    email = COALESCE(EXCLUDED.email, contacts.email),
    company = COALESCE(EXCLUDED.company, contacts.company),
    is_whatsapp = 1,
    updated_at = NOW();
