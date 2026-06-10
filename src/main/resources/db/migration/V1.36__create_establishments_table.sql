-- V1.36__create_establishments_table.sql
-- Lot 1: table establishments (module configuration)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'establishment_status'
          AND n.nspname = 'auth'
    ) THEN
        CREATE TYPE auth.establishment_status AS ENUM ('ACTIVE', 'INACTIVE');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS auth.establishments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(120),
    status auth.establishment_status NOT NULL DEFAULT 'ACTIVE',
    created_by_user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT uq_establishments_code UNIQUE (code),
    CONSTRAINT fk_establishments_created_by_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_establishments_created_by
    ON auth.establishments(created_by_user_id);
