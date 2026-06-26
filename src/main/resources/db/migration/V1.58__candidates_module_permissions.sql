-- V1.58__candidates_module_permissions.sql
-- Seed des permissions du module candidats (candidates, candidate_applications, candidate_notes)

-- 1) Seed idempotent des nouvelles permissions
WITH new_perms(name, description, module, action) AS (
    VALUES
        ('candidates:create', 'Creer un candidat', 'candidates', 'create'),
        ('candidates:read', 'Lire un candidat', 'candidates', 'read'),
        ('candidates:list', 'Lister les candidats', 'candidates', 'list'),
        ('candidates:update', 'Mettre a jour un candidat', 'candidates', 'update'),
        ('candidates:delete', 'Supprimer un candidat', 'candidates', 'delete'),
        ('candidates:hard_delete', 'Supprimer definitivement un candidat', 'candidates', 'hard_delete'),
        ('candidates:activate', 'Activer un candidat', 'candidates', 'activate'),
        ('candidates:deactivate', 'Archiver un candidat', 'candidates', 'deactivate'),
        ('candidate_applications:create', 'Creer une candidature', 'candidate_applications', 'create'),
        ('candidate_applications:read', 'Lire une candidature', 'candidate_applications', 'read'),
        ('candidate_applications:list', 'Lister les candidatures', 'candidate_applications', 'list'),
        ('candidate_applications:transition', 'Faire transiter une candidature dans le funnel', 'candidate_applications', 'transition'),
        ('candidate_applications:history', 'Consulter l historique des etapes d une candidature', 'candidate_applications', 'history'),
        ('candidate_notes:create', 'Creer une note candidat', 'candidate_notes', 'create'),
        ('candidate_notes:list', 'Lister les notes d un candidat', 'candidate_notes', 'list')
)
INSERT INTO auth.permissions (name, description, module, action)
SELECT p.name, p.description, p.module, p.action
FROM new_perms p
WHERE NOT EXISTS (
    SELECT 1 FROM auth.permissions ep WHERE ep.name = p.name
);

-- 2) Assigner toutes les permissions du module a SUPER_ADMIN
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'SUPER_ADMIN'
  AND p.module IN ('candidates', 'candidate_applications', 'candidate_notes')
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 3) Assigner toutes les permissions du module a ADMIN
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'ADMIN'
  AND p.module IN ('candidates', 'candidate_applications', 'candidate_notes')
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
