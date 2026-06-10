-- V1.41__create_user_pipeline_view_preferences_table.sql
-- Lot 6: table user_pipeline_view_preferences

CREATE TABLE IF NOT EXISTS auth.user_pipeline_view_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    establishment_id UUID NOT NULL,
    preferred_view VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_pipeline_view_preferences_user
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id),
    CONSTRAINT fk_pipeline_view_preferences_establishment
        FOREIGN KEY (establishment_id)
        REFERENCES auth.establishments(id),
    CONSTRAINT ck_pipeline_view_preferences_preferred_view
        CHECK (preferred_view IN ('KANBAN', 'TABLE', 'LIST'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pipeline_view_preferences_user_establishment
    ON auth.user_pipeline_view_preferences(user_id, establishment_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_view_preferences_establishment
    ON auth.user_pipeline_view_preferences(establishment_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_view_preferences_user
    ON auth.user_pipeline_view_preferences(user_id);
