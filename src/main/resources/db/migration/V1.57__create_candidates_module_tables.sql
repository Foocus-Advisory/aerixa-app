-- V1.57__create_candidates_module_tables.sql
-- Module Candidats: candidates, candidate_applications, candidate_notes,
-- candidate_application_stage_history, et extension funnel_stages.is_default_auto_rejection

-- 0) Extension du referentiel funnel: etape FINAL_FAILURE par defaut pour la regle d'exclusivite
ALTER TABLE auth.funnel_stages
    ADD COLUMN IF NOT EXISTS is_default_auto_rejection BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_funnel_stages_establishment_default_auto_rejection
    ON auth.funnel_stages(establishment_id)
    WHERE deleted_at IS NULL AND is_active = TRUE AND is_default_auto_rejection = TRUE;

-- 1) candidates
CREATE TABLE IF NOT EXISTS auth.candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    parent_phone_1 VARCHAR(30),
    parent_phone_2 VARCHAR(30),
    candidate_phone VARCHAR(30) NOT NULL,
    email VARCHAR(255),
    acquisition_channel_id UUID NOT NULL,
    entry_diploma_id UUID NOT NULL,
    previous_school VARCHAR(255),
    address_line VARCHAR(255),
    city VARCHAR(100),
    country VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20),
    observations TEXT,
    preferred_whatsapp_target VARCHAR(20) NOT NULL DEFAULT 'CANDIDATE',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    created_by_user_id UUID,
    created_by_label VARCHAR(255),
    updated_by_user_id UUID,
    updated_by_label VARCHAR(255),
    CONSTRAINT fk_candidates_establishment
        FOREIGN KEY (establishment_id)
        REFERENCES auth.establishments(id),
    CONSTRAINT fk_candidates_acquisition_channel
        FOREIGN KEY (acquisition_channel_id)
        REFERENCES auth.acquisition_channels(id),
    CONSTRAINT fk_candidates_entry_diploma
        FOREIGN KEY (entry_diploma_id)
        REFERENCES auth.entry_diplomas(id),
    CONSTRAINT ck_candidates_gender
        CHECK (gender IS NULL OR gender IN ('MALE', 'FEMALE', 'UNSPECIFIED')),
    CONSTRAINT ck_candidates_preferred_whatsapp_target
        CHECK (preferred_whatsapp_target IN ('PARENT_1', 'PARENT_2', 'CANDIDATE')),
    CONSTRAINT ck_candidates_status
        CHECK (status IN ('ACTIVE', 'ARCHIVED'))
);

CREATE INDEX IF NOT EXISTS idx_candidates_establishment
    ON auth.candidates(establishment_id);

CREATE INDEX IF NOT EXISTS idx_candidates_establishment_name
    ON auth.candidates(establishment_id, last_name, first_name);

CREATE INDEX IF NOT EXISTS idx_candidates_establishment_parent_phone_1
    ON auth.candidates(establishment_id, parent_phone_1);

CREATE INDEX IF NOT EXISTS idx_candidates_establishment_candidate_phone
    ON auth.candidates(establishment_id, candidate_phone);

-- 2) candidate_applications
CREATE TABLE IF NOT EXISTS auth.candidate_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID NOT NULL,
    candidate_id UUID NOT NULL,
    program_track_level_id UUID NOT NULL,
    current_stage_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    assigned_operator_id UUID,
    closed_at TIMESTAMP NULL,
    closed_reason VARCHAR(30),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    created_by_user_id UUID,
    created_by_label VARCHAR(255),
    updated_by_user_id UUID,
    updated_by_label VARCHAR(255),
    CONSTRAINT fk_candidate_applications_establishment
        FOREIGN KEY (establishment_id)
        REFERENCES auth.establishments(id),
    CONSTRAINT fk_candidate_applications_candidate
        FOREIGN KEY (candidate_id)
        REFERENCES auth.candidates(id),
    CONSTRAINT fk_candidate_applications_program_track_level
        FOREIGN KEY (program_track_level_id)
        REFERENCES auth.program_track_levels(id),
    CONSTRAINT fk_candidate_applications_current_stage
        FOREIGN KEY (current_stage_id)
        REFERENCES auth.funnel_stages(id),
    CONSTRAINT fk_candidate_applications_assigned_operator
        FOREIGN KEY (assigned_operator_id)
        REFERENCES auth.users(id),
    CONSTRAINT ck_candidate_applications_status
        CHECK (status IN ('IN_PROGRESS', 'ACCEPTED', 'REJECTED')),
    CONSTRAINT ck_candidate_applications_closed_reason
        CHECK (closed_reason IS NULL OR closed_reason IN ('MANUAL', 'AUTO_OTHER_OFFER_ACCEPTED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_candidate_applications_candidate_program_track_level
    ON auth.candidate_applications(candidate_id, program_track_level_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_candidate_applications_establishment
    ON auth.candidate_applications(establishment_id);

CREATE INDEX IF NOT EXISTS idx_candidate_applications_candidate
    ON auth.candidate_applications(candidate_id);

CREATE INDEX IF NOT EXISTS idx_candidate_applications_current_stage
    ON auth.candidate_applications(current_stage_id);

CREATE INDEX IF NOT EXISTS idx_candidate_applications_status
    ON auth.candidate_applications(status);

-- 3) candidate_notes
CREATE TABLE IF NOT EXISTS auth.candidate_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID NOT NULL,
    candidate_id UUID NOT NULL,
    candidate_application_id UUID,
    type VARCHAR(30) NOT NULL,
    content TEXT NOT NULL,
    author_user_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID,
    created_by_label VARCHAR(255),
    updated_by_user_id UUID,
    updated_by_label VARCHAR(255),
    CONSTRAINT fk_candidate_notes_establishment
        FOREIGN KEY (establishment_id)
        REFERENCES auth.establishments(id),
    CONSTRAINT fk_candidate_notes_candidate
        FOREIGN KEY (candidate_id)
        REFERENCES auth.candidates(id),
    CONSTRAINT fk_candidate_notes_candidate_application
        FOREIGN KEY (candidate_application_id)
        REFERENCES auth.candidate_applications(id),
    CONSTRAINT fk_candidate_notes_author
        FOREIGN KEY (author_user_id)
        REFERENCES auth.users(id),
    CONSTRAINT ck_candidate_notes_type
        CHECK (type IN ('FREE_TEXT', 'STAGE_TRANSITION', 'SYSTEM'))
);

CREATE INDEX IF NOT EXISTS idx_candidate_notes_candidate
    ON auth.candidate_notes(candidate_id);

CREATE INDEX IF NOT EXISTS idx_candidate_notes_candidate_application
    ON auth.candidate_notes(candidate_application_id);

-- 4) candidate_application_stage_history
CREATE TABLE IF NOT EXISTS auth.candidate_application_stage_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_application_id UUID NOT NULL,
    from_stage_id UUID,
    to_stage_id UUID NOT NULL,
    transition_type VARCHAR(30) NOT NULL,
    note_id UUID,
    actor_user_id UUID,
    occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cash_candidate_application
        FOREIGN KEY (candidate_application_id)
        REFERENCES auth.candidate_applications(id),
    CONSTRAINT fk_cash_from_stage
        FOREIGN KEY (from_stage_id)
        REFERENCES auth.funnel_stages(id),
    CONSTRAINT fk_cash_to_stage
        FOREIGN KEY (to_stage_id)
        REFERENCES auth.funnel_stages(id),
    CONSTRAINT fk_cash_note
        FOREIGN KEY (note_id)
        REFERENCES auth.candidate_notes(id),
    CONSTRAINT fk_cash_actor
        FOREIGN KEY (actor_user_id)
        REFERENCES auth.users(id),
    CONSTRAINT ck_cash_transition_type
        CHECK (transition_type IN ('MANUAL', 'AUTO_INITIAL', 'AUTO_EXCLUSIVITY'))
);

CREATE INDEX IF NOT EXISTS idx_cash_candidate_application
    ON auth.candidate_application_stage_history(candidate_application_id);

CREATE INDEX IF NOT EXISTS idx_cash_occurred_at
    ON auth.candidate_application_stage_history(occurred_at);
