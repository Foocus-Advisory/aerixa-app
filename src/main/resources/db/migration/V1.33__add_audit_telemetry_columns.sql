DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_outcome') THEN
        CREATE TYPE audit_outcome AS ENUM ('SUCCESS', 'FAILURE');
    END IF;
END $$;

ALTER TABLE auth.audit_logs
    ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS actor_roles JSONB,
    ADD COLUMN IF NOT EXISTS outcome audit_outcome NOT NULL DEFAULT 'SUCCESS',
    ADD COLUMN IF NOT EXISTS reason_code VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation_id ON auth.audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_outcome ON auth.audit_logs(outcome);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp_outcome ON auth.audit_logs(timestamp, outcome);
