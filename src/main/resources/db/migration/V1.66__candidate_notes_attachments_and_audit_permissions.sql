-- V1.66__candidate_notes_attachments_and_audit_permissions.sql
-- Module Candidats: suivi de candidature (page de detail) - notes modifiables/supprimables
-- par leur auteur, pieces jointes auditees, et permissions associees + lecture d'audit.

-- 1) candidate_notes: support de la suppression (logique) pour permettre a l'onglet Audit
--    de conserver la trace meme apres suppression d'une note par son auteur.
ALTER TABLE auth.candidate_notes
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_candidate_notes_deleted_at
    ON auth.candidate_notes(deleted_at);

-- 2) candidate_note_attachments
-- Stockage configurable: aujourd'hui en base (storage_type = 'DATABASE', contenu dans
-- file_content), mais la colonne storage_type et storage_ref permettent de basculer plus
-- tard vers un stockage objet externe (ex: S3/MinIO) sans changer le contrat de l'API.
CREATE TABLE IF NOT EXISTS auth.candidate_note_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID NOT NULL,
    candidate_note_id UUID NOT NULL,
    storage_type VARCHAR(20) NOT NULL DEFAULT 'DATABASE',
    storage_ref TEXT,
    file_content BYTEA,
    content_type VARCHAR(120) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by_user_id UUID,
    uploaded_by_label VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    deleted_by_user_id UUID,
    deleted_by_label VARCHAR(255),
    CONSTRAINT fk_cna_establishment
        FOREIGN KEY (establishment_id)
        REFERENCES auth.establishments(id),
    CONSTRAINT fk_cna_candidate_note
        FOREIGN KEY (candidate_note_id)
        REFERENCES auth.candidate_notes(id),
    CONSTRAINT fk_cna_uploaded_by
        FOREIGN KEY (uploaded_by_user_id)
        REFERENCES auth.users(id),
    CONSTRAINT fk_cna_deleted_by
        FOREIGN KEY (deleted_by_user_id)
        REFERENCES auth.users(id),
    CONSTRAINT ck_cna_storage_type
        CHECK (storage_type IN ('DATABASE', 'EXTERNAL'))
);

CREATE INDEX IF NOT EXISTS idx_cna_candidate_note
    ON auth.candidate_note_attachments(candidate_note_id);

CREATE INDEX IF NOT EXISTS idx_cna_deleted_at
    ON auth.candidate_note_attachments(deleted_at);

-- 3) Permissions: edition/suppression de notes, gestion des pieces jointes, lecture audit.
INSERT INTO auth.permissions (name, description, module, action)
SELECT v.name, v.description, v.module, v.action
FROM (VALUES
    ('candidate_notes:update', 'Modifier une note de candidature (auteur uniquement)', 'candidate_notes', 'update'),
    ('candidate_notes:delete', 'Supprimer une note de candidature', 'candidate_notes', 'delete'),
    ('candidate_attachments:create', 'Joindre un fichier a une note de candidature', 'candidate_attachments', 'create'),
    ('candidate_attachments:read', 'Consulter/telecharger une piece jointe de candidature', 'candidate_attachments', 'read'),
    ('candidate_attachments:delete', 'Supprimer une piece jointe de candidature', 'candidate_attachments', 'delete'),
    ('candidate_application_audit:read', 'Consulter l''onglet Audit d''une candidature', 'candidate_application_audit', 'read')
) AS v(name, description, module, action)
WHERE NOT EXISTS (
    SELECT 1 FROM auth.permissions p WHERE p.name = v.name
);

-- 4) Assignation par defaut a SUPER_ADMIN et ADMIN, comme le reste du module candidates.
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name IN ('SUPER_ADMIN', 'ADMIN')
  AND p.name IN (
      'candidate_notes:update',
      'candidate_notes:delete',
      'candidate_attachments:create',
      'candidate_attachments:read',
      'candidate_attachments:delete',
      'candidate_application_audit:read'
  )
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
