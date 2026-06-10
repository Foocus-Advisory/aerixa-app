-- Add created_by/updated_by tracking to all remaining entity tables
-- (config tables were handled in V1.47)

ALTER TABLE auth.users
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);

ALTER TABLE auth.roles
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);

ALTER TABLE auth.permissions
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);

ALTER TABLE auth.sessions
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);

ALTER TABLE auth.audit_logs
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS establishment_id   UUID;

ALTER TABLE auth.notifications
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);

ALTER TABLE auth.mail_templates
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);

ALTER TABLE auth.user_pipeline_view_preferences
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);

ALTER TABLE auth.mfa_challenges
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);

ALTER TABLE auth.mfa_recovery_codes
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);

ALTER TABLE auth.password_resets
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);

ALTER TABLE auth.email_verifications
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);
