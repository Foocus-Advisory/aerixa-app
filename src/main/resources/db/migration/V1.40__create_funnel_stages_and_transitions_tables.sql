-- V1.40__create_funnel_stages_and_transitions_tables.sql
-- Lot 5: tables funnel_stages et funnel_stage_transitions

CREATE TABLE IF NOT EXISTS auth.funnel_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID NOT NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    stage_type VARCHAR(30) NOT NULL,
    position_order INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_funnel_stages_establishment
        FOREIGN KEY (establishment_id)
        REFERENCES auth.establishments(id),
    CONSTRAINT ck_funnel_stages_stage_type
        CHECK (stage_type IN ('INITIAL', 'INTERMEDIATE', 'FINAL_SUCCESS', 'FINAL_FAILURE')),
    CONSTRAINT ck_funnel_stages_position_order_positive
        CHECK (position_order > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_funnel_stages_establishment_code
    ON auth.funnel_stages(establishment_id, LOWER(code));

CREATE UNIQUE INDEX IF NOT EXISTS uq_funnel_stages_establishment_position
    ON auth.funnel_stages(establishment_id, position_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_funnel_stages_establishment
    ON auth.funnel_stages(establishment_id);

CREATE INDEX IF NOT EXISTS idx_funnel_stages_type
    ON auth.funnel_stages(stage_type);

CREATE TABLE IF NOT EXISTS auth.funnel_stage_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID NOT NULL,
    from_stage_id UUID NOT NULL,
    to_stage_id UUID NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_funnel_stage_transitions_establishment
        FOREIGN KEY (establishment_id)
        REFERENCES auth.establishments(id),
    CONSTRAINT fk_funnel_stage_transitions_from_stage
        FOREIGN KEY (from_stage_id)
        REFERENCES auth.funnel_stages(id),
    CONSTRAINT fk_funnel_stage_transitions_to_stage
        FOREIGN KEY (to_stage_id)
        REFERENCES auth.funnel_stages(id),
    CONSTRAINT ck_funnel_stage_transitions_no_self_loop
        CHECK (from_stage_id <> to_stage_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_funnel_stage_transitions_establishment_pair
    ON auth.funnel_stage_transitions(establishment_id, from_stage_id, to_stage_id);

CREATE INDEX IF NOT EXISTS idx_funnel_stage_transitions_establishment
    ON auth.funnel_stage_transitions(establishment_id);

CREATE INDEX IF NOT EXISTS idx_funnel_stage_transitions_from_stage
    ON auth.funnel_stage_transitions(from_stage_id);

CREATE INDEX IF NOT EXISTS idx_funnel_stage_transitions_to_stage
    ON auth.funnel_stage_transitions(to_stage_id);
