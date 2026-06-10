-- V1.32__normalize_sensitive_permissions_model.sql
-- Stream 1.2: normalisation des permissions sensibles users/sessions/notifications
-- Objectifs:
-- 1) Introduire users:hard_delete pour distinguer soft delete vs suppression physique
-- 2) Marquer les permissions legacy users:read et sessions:read comme deprecated
-- 3) Aligner role_permissions SUPER_ADMIN/ADMIN/OPERATOR selon le modele cible

-- 1) Nouvelle permission explicite pour la suppression physique
INSERT INTO auth.permissions (name, description, module, action)
SELECT 'users:hard_delete', 'Suppression physique definitive d''un utilisateur', 'users', 'hard_delete'
WHERE NOT EXISTS (
    SELECT 1 FROM auth.permissions p WHERE p.name = 'users:hard_delete'
);

-- 2) Nettoyage des attributions legacy
DELETE FROM auth.role_permissions rp
USING auth.permissions p
WHERE rp.permission_id = p.id
  AND p.name IN ('users:read', 'sessions:read');

-- Marquer legacy comme supprime logique pour eviter les futures attributions accidentelles
UPDATE auth.permissions
SET deleted_at = COALESCE(deleted_at, NOW())
WHERE name IN ('users:read', 'sessions:read');

-- 3) Assigner users:hard_delete uniquement a SUPER_ADMIN
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, p.id
FROM auth.permissions p
WHERE p.name = 'users:hard_delete'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = '00000000-0000-0000-0000-000000000001'::uuid
        AND rp.permission_id = p.id
  );

-- Garantir que ADMIN/OPERATOR n'ont pas users:hard_delete
DELETE FROM auth.role_permissions rp
USING auth.permissions p
WHERE rp.permission_id = p.id
  AND p.name = 'users:hard_delete'
  AND rp.role_id IN (
      '00000000-0000-0000-0000-000000000002'::uuid,
      '00000000-0000-0000-0000-000000000003'::uuid
  );

-- 4) Re-alignement des permissions users de lecture scopee
-- SUPER_ADMIN: read_all
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, p.id
FROM auth.permissions p
WHERE p.name = 'users:read_all'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = '00000000-0000-0000-0000-000000000001'::uuid
        AND rp.permission_id = p.id
  );

-- ADMIN: read_children
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002'::uuid, p.id
FROM auth.permissions p
WHERE p.name = 'users:read_children'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = '00000000-0000-0000-0000-000000000002'::uuid
        AND rp.permission_id = p.id
  );

-- OPERATOR: pas d'acces users admin scope
DELETE FROM auth.role_permissions rp
USING auth.permissions p
WHERE rp.permission_id = p.id
  AND p.name IN ('users:read_all', 'users:read_children')
  AND rp.role_id = '00000000-0000-0000-0000-000000000003'::uuid;

-- 5) Re-alignement sessions
-- SUPER_ADMIN: read_all + revoke
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, p.id
FROM auth.permissions p
WHERE p.name IN ('sessions:read_all', 'sessions:revoke')
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = '00000000-0000-0000-0000-000000000001'::uuid
        AND rp.permission_id = p.id
  );

-- ADMIN: read_children + revoke
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002'::uuid, p.id
FROM auth.permissions p
WHERE p.name IN ('sessions:read_children', 'sessions:revoke')
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = '00000000-0000-0000-0000-000000000002'::uuid
        AND rp.permission_id = p.id
  );

-- OPERATOR: seulement les permissions personnelles sessions
DELETE FROM auth.role_permissions rp
USING auth.permissions p
WHERE rp.permission_id = p.id
  AND p.name IN ('sessions:read_all', 'sessions:read_children', 'sessions:revoke')
  AND rp.role_id = '00000000-0000-0000-0000-000000000003'::uuid;

-- 6) Notifications (rappel idempotent de la politique cible)
-- SUPER_ADMIN/ADMIN: read/edit/delete ; OPERATOR: read/edit
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT role_id, permission_id
FROM (
    SELECT '00000000-0000-0000-0000-000000000001'::uuid AS role_id, p.id AS permission_id
    FROM auth.permissions p
    WHERE p.name IN ('notifications:read', 'notifications:edit', 'notifications:delete')
      AND p.deleted_at IS NULL

    UNION ALL

    SELECT '00000000-0000-0000-0000-000000000002'::uuid AS role_id, p.id AS permission_id
    FROM auth.permissions p
    WHERE p.name IN ('notifications:read', 'notifications:edit', 'notifications:delete')
      AND p.deleted_at IS NULL

    UNION ALL

    SELECT '00000000-0000-0000-0000-000000000003'::uuid AS role_id, p.id AS permission_id
    FROM auth.permissions p
    WHERE p.name IN ('notifications:read', 'notifications:edit')
      AND p.deleted_at IS NULL
) s
WHERE NOT EXISTS (
    SELECT 1 FROM auth.role_permissions rp
    WHERE rp.role_id = s.role_id
      AND rp.permission_id = s.permission_id
);

-- OPERATOR: pas de suppression notifications
DELETE FROM auth.role_permissions rp
USING auth.permissions p
WHERE rp.permission_id = p.id
  AND p.name = 'notifications:delete'
  AND rp.role_id = '00000000-0000-0000-0000-000000000003'::uuid;
