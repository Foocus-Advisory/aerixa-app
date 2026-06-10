-- Fix: auth.mail_templates.created_by_user_id was VARCHAR(36) from V1.16
-- but AuditableEntity expects UUID. V1.48 skipped it with IF NOT EXISTS.
-- Convert using USING clause to cast any existing valid UUID strings.

ALTER TABLE auth.mail_templates
    ALTER COLUMN created_by_user_id TYPE UUID
    USING CASE
        WHEN created_by_user_id IS NULL OR trim(created_by_user_id) = '' THEN NULL
        ELSE created_by_user_id::UUID
    END;
