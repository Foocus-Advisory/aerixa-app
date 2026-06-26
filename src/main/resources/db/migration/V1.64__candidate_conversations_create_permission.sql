-- V1.64__candidate_conversations_create_permission.sql
-- Module Candidats: ajout de la permission candidate_conversations:create

-- 1) Seed idempotent de la permission
INSERT INTO auth.permissions (name, description, module, action)
SELECT 'candidate_conversations:create', 'Demarrer une conversation WhatsApp avec un candidat', 'candidate_conversations', 'create'
WHERE NOT EXISTS (
    SELECT 1 FROM auth.permissions WHERE name = 'candidate_conversations:create'
);

-- 2) Assigner la permission a SUPER_ADMIN et ADMIN
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name IN ('SUPER_ADMIN', 'ADMIN')
  AND p.name = 'candidate_conversations:create'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
