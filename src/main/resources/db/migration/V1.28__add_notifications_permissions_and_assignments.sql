-- V1.28__add_notifications_permissions_and_assignments.sql
-- Ajoute des permissions explicites pour le module notifications
-- et les affecte aux rôles système selon le niveau de responsabilité.

INSERT INTO auth.permissions (name, description, module, action)
SELECT 'notifications:read', 'Consulter ses notifications', 'notifications', 'read'
WHERE NOT EXISTS (SELECT 1 FROM auth.permissions p WHERE p.name = 'notifications:read');

INSERT INTO auth.permissions (name, description, module, action)
SELECT 'notifications:edit', 'Marquer ses notifications lues/non lues', 'notifications', 'edit'
WHERE NOT EXISTS (SELECT 1 FROM auth.permissions p WHERE p.name = 'notifications:edit');

INSERT INTO auth.permissions (name, description, module, action)
SELECT 'notifications:delete', 'Supprimer ses notifications', 'notifications', 'delete'
WHERE NOT EXISTS (SELECT 1 FROM auth.permissions p WHERE p.name = 'notifications:delete');

-- SUPER_ADMIN: contrôle total
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, p.id
FROM auth.permissions p
WHERE p.name IN ('notifications:read', 'notifications:edit', 'notifications:delete')
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = '00000000-0000-0000-0000-000000000001'::uuid
        AND rp.permission_id = p.id
  );

-- ADMIN: gestion complète des notifications
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002'::uuid, p.id
FROM auth.permissions p
WHERE p.name IN ('notifications:read', 'notifications:edit', 'notifications:delete')
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = '00000000-0000-0000-0000-000000000002'::uuid
        AND rp.permission_id = p.id
  );

-- OPERATOR: lecture et mise à jour de l'état (pas de suppression massive)
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003'::uuid, p.id
FROM auth.permissions p
WHERE p.name IN ('notifications:read', 'notifications:edit')
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = '00000000-0000-0000-0000-000000000003'::uuid
        AND rp.permission_id = p.id
  );
