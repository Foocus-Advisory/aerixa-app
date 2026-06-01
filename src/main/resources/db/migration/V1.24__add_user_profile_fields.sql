-- V1.24__add_user_profile_fields.sql
-- Ajoute les champs de profil utilisateur et la photo de profil

ALTER TABLE auth.users
    ADD COLUMN IF NOT EXISTS address_line_1 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address_line_2 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS city VARCHAR(120),
    ADD COLUMN IF NOT EXISTS postal_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS country VARCHAR(120),
    ADD COLUMN IF NOT EXISTS bio VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS profile_photo BYTEA,
    ADD COLUMN IF NOT EXISTS profile_photo_content_type VARCHAR(120),
    ADD COLUMN IF NOT EXISTS profile_photo_filename VARCHAR(255);