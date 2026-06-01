-- V1.14__add_audit_soft_delete_base_columns.sql
-- Harmonisation des colonnes audit/soft-delete pour héritage BaseEntity/Auditable/SoftDelete

-- permissions: ajoute updated_at pour alignement AuditableEntity
ALTER TABLE auth.permissions
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- sessions: ajoute updated_at + deleted_at pour alignement SoftDeletableEntity
ALTER TABLE auth.sessions
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at ON auth.sessions(deleted_at);

-- audit_logs: ajoute created_at + updated_at + deleted_at pour alignement SoftDeletableEntity
ALTER TABLE auth.audit_logs
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Backfill created_at depuis timestamp pour les anciennes lignes
UPDATE auth.audit_logs
SET created_at = timestamp
WHERE created_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_deleted_at ON auth.audit_logs(deleted_at);
