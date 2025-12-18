-- Add is_whatsapp column to contacts table
ALTER TABLE "contacts" ADD COLUMN "is_whatsapp" integer DEFAULT 0 NOT NULL;
