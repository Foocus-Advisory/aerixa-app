-- V1.7__create_audit_logs_table.sql
-- Audit logs pour traçabilité des actions

CREATE TABLE auth.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES auth.sessions(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    resource_path VARCHAR(500),
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    details JSONB,
    status_code INTEGER,
    error_message TEXT
);

-- Indexes
CREATE INDEX idx_audit_logs_user_id ON auth.audit_logs(user_id);
CREATE INDEX idx_audit_logs_session_id ON auth.audit_logs(session_id);
CREATE INDEX idx_audit_logs_action ON auth.audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON auth.audit_logs(timestamp);
CREATE INDEX idx_audit_logs_entity ON auth.audit_logs(entity_type, entity_id);
