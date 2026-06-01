-- V1.15__create_notifications_table.sql
-- Table des notifications utilisateur (persistantes)

CREATE TABLE auth.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    notification_type VARCHAR(40) NOT NULL DEFAULT 'INFO',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON auth.notifications(user_id);
CREATE INDEX idx_notifications_user_id_is_read ON auth.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON auth.notifications(created_at DESC);
CREATE INDEX idx_notifications_deleted_at ON auth.notifications(deleted_at);

-- Seed d'un jeu initial de notifications pour le super admin
INSERT INTO auth.notifications (user_id, title, description, notification_type, is_read, created_at)
VALUES
    (
        '00000000-0000-0000-0000-000000000099'::uuid,
        'Nouvelle tentative de connexion',
        'Un utilisateur a tente une connexion depuis un nouvel appareil.',
        'SECURITY',
        FALSE,
        CURRENT_TIMESTAMP - INTERVAL '5 minutes'
    ),
    (
        '00000000-0000-0000-0000-000000000099'::uuid,
        'Mot de passe expire',
        'Un compte admin doit renouveler son mot de passe.',
        'WARNING',
        FALSE,
        CURRENT_TIMESTAMP - INTERVAL '20 minutes'
    ),
    (
        '00000000-0000-0000-0000-000000000099'::uuid,
        'Session revoquee',
        'Une session inactive a ete revoquee automatiquement.',
        'INFO',
        TRUE,
        CURRENT_TIMESTAMP - INTERVAL '1 day'
    );