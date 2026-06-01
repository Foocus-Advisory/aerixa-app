-- V1.2__create_roles_table.sql
-- Table des rôles

CREATE TABLE auth.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 1,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP -- Soft delete
);

-- Indexes
CREATE INDEX idx_roles_name ON auth.roles(name);
CREATE INDEX idx_roles_level ON auth.roles(level);
CREATE INDEX idx_roles_is_system ON auth.roles(is_system);
CREATE INDEX idx_roles_deleted_at ON auth.roles(deleted_at);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_roles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roles_updated_at_trigger
BEFORE UPDATE ON auth.roles
FOR EACH ROW
EXECUTE FUNCTION update_roles_timestamp();
