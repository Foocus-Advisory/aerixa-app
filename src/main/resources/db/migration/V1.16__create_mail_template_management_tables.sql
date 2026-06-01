-- V1.16__create_mail_template_management_tables.sql
-- Creation des tables pour la gestion centralisee des templates mail

CREATE TABLE auth.mail_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    default_recipient VARCHAR(100),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    min_resend_interval_seconds BIGINT NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    show_system_comments BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auth.mail_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mail_type_id UUID NOT NULL REFERENCES auth.mail_types(id) ON DELETE CASCADE,
    subject VARCHAR(500) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    preview VARCHAR(500),
    version_number INTEGER NOT NULL DEFAULT 1,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    language VARCHAR(10) NOT NULL DEFAULT 'fr',
    version_notes VARCHAR(500),
    created_by_user_id VARCHAR(36),
    last_modified_by_user_id VARCHAR(36),
    published_at BIGINT,
    supported_variables TEXT,
    custom_styles TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auth.mail_template_variables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL,
    description VARCHAR(500),
    example_value VARCHAR(255),
    category VARCHAR(50) NOT NULL,
    data_type VARCHAR(50) NOT NULL DEFAULT 'STRING',
    required BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    pattern VARCHAR(255),
    applicable_mail_types TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mail_type_code ON auth.mail_types(code);
CREATE INDEX idx_mail_template_type ON auth.mail_templates(mail_type_id);
CREATE INDEX idx_mail_template_current ON auth.mail_templates(mail_type_id, is_current, language);
CREATE INDEX idx_mail_template_var_code ON auth.mail_template_variables(code);
CREATE INDEX idx_mail_template_var_category ON auth.mail_template_variables(category);
