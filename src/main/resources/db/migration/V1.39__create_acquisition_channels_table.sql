-- V1.39__create_acquisition_channels_table.sql
-- Lot 4: table acquisition_channels

CREATE TABLE IF NOT EXISTS auth.acquisition_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID NOT NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_acquisition_channels_establishment
        FOREIGN KEY (establishment_id)
        REFERENCES auth.establishments(id),
    CONSTRAINT ck_acquisition_channels_type
        CHECK (type IN ('DIRECT', 'INDIRECT'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_acquisition_channels_establishment_code
    ON auth.acquisition_channels(establishment_id, LOWER(code));

CREATE INDEX IF NOT EXISTS idx_acquisition_channels_establishment
    ON auth.acquisition_channels(establishment_id);

CREATE INDEX IF NOT EXISTS idx_acquisition_channels_type
    ON auth.acquisition_channels(type);

CREATE INDEX IF NOT EXISTS idx_acquisition_channels_is_active
    ON auth.acquisition_channels(is_active);
