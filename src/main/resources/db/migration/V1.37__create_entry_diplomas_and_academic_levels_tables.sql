-- V1.37__create_entry_diplomas_and_academic_levels_tables.sql
-- Lot 2: tables entry_diplomas et academic_levels

CREATE TABLE IF NOT EXISTS auth.entry_diplomas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID NOT NULL,
    code VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    rank_order INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_entry_diplomas_establishment
        FOREIGN KEY (establishment_id)
        REFERENCES auth.establishments(id),
    CONSTRAINT chk_entry_diplomas_rank_order_positive
        CHECK (rank_order > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_entry_diplomas_establishment_code
    ON auth.entry_diplomas(establishment_id, LOWER(code));

CREATE INDEX IF NOT EXISTS idx_entry_diplomas_establishment
    ON auth.entry_diplomas(establishment_id);

CREATE INDEX IF NOT EXISTS idx_entry_diplomas_is_active
    ON auth.entry_diplomas(is_active);

CREATE TABLE IF NOT EXISTS auth.academic_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID NOT NULL,
    code VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    rank_order INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_academic_levels_establishment
        FOREIGN KEY (establishment_id)
        REFERENCES auth.establishments(id),
    CONSTRAINT chk_academic_levels_rank_order_positive
        CHECK (rank_order > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_levels_establishment_code
    ON auth.academic_levels(establishment_id, LOWER(code));

CREATE INDEX IF NOT EXISTS idx_academic_levels_establishment
    ON auth.academic_levels(establishment_id);

CREATE INDEX IF NOT EXISTS idx_academic_levels_is_active
    ON auth.academic_levels(is_active);
