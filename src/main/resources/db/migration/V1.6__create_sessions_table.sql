-- V1.6__create_sessions_table.sql
-- Table des sessions utilisateurs

CREATE TABLE auth.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    device_type device_type DEFAULT 'DESKTOP',
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    location VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sessions_user_id ON auth.sessions(user_id);
CREATE INDEX idx_sessions_access_token_hash ON auth.sessions(access_token_hash);
CREATE INDEX idx_sessions_refresh_token_hash ON auth.sessions(refresh_token_hash);
CREATE INDEX idx_sessions_expires_at ON auth.sessions(expires_at);
CREATE INDEX idx_sessions_revoked_at ON auth.sessions(revoked_at);

-- Trigger pour last_activity_at
CREATE OR REPLACE FUNCTION update_sessions_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_activity_trigger
BEFORE UPDATE ON auth.sessions
FOR EACH ROW
EXECUTE FUNCTION update_sessions_activity();
