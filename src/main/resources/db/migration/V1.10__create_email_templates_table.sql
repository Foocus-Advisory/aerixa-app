-- V1.10__create_email_templates_table.sql
-- Templates d'emails transactionnels (itération 3)

CREATE TABLE auth.email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_email_templates_name ON auth.email_templates(name);
CREATE INDEX idx_email_templates_is_active ON auth.email_templates(is_active);
CREATE INDEX idx_email_templates_deleted_at ON auth.email_templates(deleted_at);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_email_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_templates_updated_at_trigger
BEFORE UPDATE ON auth.email_templates
FOR EACH ROW
EXECUTE FUNCTION update_email_templates_timestamp();
