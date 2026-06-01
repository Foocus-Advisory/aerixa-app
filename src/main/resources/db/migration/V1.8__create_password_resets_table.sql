-- V1.8__create_password_resets_table.sql
-- Tokens de réinitialisation de mot de passe

CREATE TABLE auth.password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    ip_address VARCHAR(45)
);

-- Indexes
CREATE INDEX idx_password_resets_user_id ON auth.password_resets(user_id);
CREATE INDEX idx_password_resets_token_hash ON auth.password_resets(token_hash);
CREATE INDEX idx_password_resets_expires_at ON auth.password_resets(expires_at);
