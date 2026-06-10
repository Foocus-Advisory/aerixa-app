-- V1.56__funnel_stage_transitions_hard_delete_permission.sql
-- Ajoute la permission hard_delete pour le module funnel_stage_transitions

-- 1) Seed idempotent de la nouvelle permission
WITH new_perms(name, description, module, action) AS (
    VALUES
        ('funnel_stage_transitions:hard_delete', 'Supprimer definitivement une transition de funnel', 'funnel_stage_transitions', 'hard_delete')
)
INSERT INTO auth.permissions (name, description, module, action)
SELECT p.name, p.description, p.module, p.action
FROM new_perms p
WHERE NOT EXISTS (
    SELECT 1 FROM auth.permissions ep WHERE ep.name = p.name
);

-- 2) Assigner a SUPER_ADMIN
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'SUPER_ADMIN'
  AND p.name = 'funnel_stage_transitions:hard_delete'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 3) Assigner a ADMIN
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'ADMIN'
  AND p.name = 'funnel_stage_transitions:hard_delete'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
