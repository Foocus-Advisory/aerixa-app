-- V1.31__add_mfa_support.sql
-- Ajoute le support MFA (TOTP) et les recovery codes.

ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS mfa_method VARCHAR(50);
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(512);
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS auth.mfa_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_type VARCHAR(50) NOT NULL,
    challenge_secret VARCHAR(255),
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mfa_challenges_user_id ON auth.mfa_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_expires_at ON auth.mfa_challenges(expires_at);

CREATE TABLE IF NOT EXISTS auth.mfa_recovery_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_user_id ON auth.mfa_recovery_codes(user_id);
