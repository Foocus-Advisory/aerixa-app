-- V1.9__create_email_verifications_table.sql
-- Tokens de vérification d'email

CREATE TABLE auth.email_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    ip_address VARCHAR(45)
);

-- Indexes
CREATE INDEX idx_email_verifications_user_id ON auth.email_verifications(user_id);
CREATE INDEX idx_email_verifications_token_hash ON auth.email_verifications(token_hash);
CREATE INDEX idx_email_verifications_expires_at ON auth.email_verifications(expires_at);
