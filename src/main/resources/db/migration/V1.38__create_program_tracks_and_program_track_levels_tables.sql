-- V1.38__create_program_tracks_and_program_track_levels_tables.sql
-- Lot 3: tables program_tracks et program_track_levels

CREATE TABLE IF NOT EXISTS auth.program_tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID NOT NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_program_tracks_establishment
        FOREIGN KEY (establishment_id)
        REFERENCES auth.establishments(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_program_tracks_establishment_code
    ON auth.program_tracks(establishment_id, LOWER(code));

CREATE INDEX IF NOT EXISTS idx_program_tracks_establishment
    ON auth.program_tracks(establishment_id);

CREATE INDEX IF NOT EXISTS idx_program_tracks_is_active
    ON auth.program_tracks(is_active);

CREATE TABLE IF NOT EXISTS auth.program_track_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID NOT NULL,
    program_track_id UUID NOT NULL,
    academic_level_id UUID NOT NULL,
    is_open_for_application BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_program_track_levels_establishment
        FOREIGN KEY (establishment_id)
        REFERENCES auth.establishments(id),
    CONSTRAINT fk_program_track_levels_program_track
        FOREIGN KEY (program_track_id)
        REFERENCES auth.program_tracks(id),
    CONSTRAINT fk_program_track_levels_academic_level
        FOREIGN KEY (academic_level_id)
        REFERENCES auth.academic_levels(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_program_track_levels_unique_mapping
    ON auth.program_track_levels(establishment_id, program_track_id, academic_level_id);

CREATE INDEX IF NOT EXISTS idx_program_track_levels_establishment
    ON auth.program_track_levels(establishment_id);

CREATE INDEX IF NOT EXISTS idx_program_track_levels_program_track
    ON auth.program_track_levels(program_track_id);

CREATE INDEX IF NOT EXISTS idx_program_track_levels_academic_level
    ON auth.program_track_levels(academic_level_id);
