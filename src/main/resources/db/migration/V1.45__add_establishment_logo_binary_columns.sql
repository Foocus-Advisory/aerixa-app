-- V1.45__add_establishment_logo_binary_columns.sql
-- Add binary logo storage for establishments.

ALTER TABLE auth.establishments
    ADD COLUMN IF NOT EXISTS logo_file bytea,
    ADD COLUMN IF NOT EXISTS logo_content_type VARCHAR(120),
    ADD COLUMN IF NOT EXISTS logo_filename VARCHAR(255);
