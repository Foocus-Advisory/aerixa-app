-- Add created_by / updated_by tracking to all configuration entity tables

ALTER TABLE auth.academic_levels
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);

ALTER TABLE auth.entry_diplomas
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);

ALTER TABLE auth.program_tracks
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);

ALTER TABLE auth.program_track_levels
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);

ALTER TABLE auth.acquisition_channels
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);

ALTER TABLE auth.funnel_stages
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);

ALTER TABLE auth.funnel_stage_transitions
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);

-- Establishment already has created_by_user_id; add the three missing fields
ALTER TABLE auth.establishments
    ADD COLUMN IF NOT EXISTS created_by_label   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_label   VARCHAR(255);
