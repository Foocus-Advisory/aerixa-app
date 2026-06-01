-- V1.3__create_permissions_table.sql
-- Table des permissions (seeded via migrations, non éditables en UI)

CREATE TABLE auth.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP -- Soft delete
);

-- Indexes
CREATE INDEX idx_permissions_name ON auth.permissions(name);
CREATE INDEX idx_permissions_module ON auth.permissions(module);
CREATE INDEX idx_permissions_action ON auth.permissions(action);
CREATE INDEX idx_permissions_deleted_at ON auth.permissions(deleted_at);
