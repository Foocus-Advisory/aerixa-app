-- Add created_by/updated_by tracking columns missed in V1.48

ALTER TABLE auth.mail_template_variables
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);

ALTER TABLE auth.mail_types
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);
