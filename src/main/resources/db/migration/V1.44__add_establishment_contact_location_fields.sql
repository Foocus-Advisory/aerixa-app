-- V1.44__add_establishment_contact_location_fields.sql
-- Add location/contact/media fields for establishments configuration module.

ALTER TABLE auth.establishments
    ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS country VARCHAR(100),
    ADD COLUMN IF NOT EXISTS whatsapp_phone_prefix VARCHAR(10),
    ADD COLUMN IF NOT EXISTS whatsapp_phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS other_phone_prefix VARCHAR(10),
    ADD COLUMN IF NOT EXISTS other_phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS logo_url TEXT;
