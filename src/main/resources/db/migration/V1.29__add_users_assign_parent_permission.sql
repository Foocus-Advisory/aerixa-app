-- V1.29__add_users_assign_parent_permission.sql
-- Permission dédiée pour affecter un parent ADMIN/SUPER_ADMIN à un OPERATOR.

INSERT INTO auth.permissions (name, description, module, action)
SELECT 'users:assign_parent', 'Affecter un parent ADMIN/SUPER_ADMIN a un OPERATOR', 'users', 'assign_parent'
WHERE NOT EXISTS (SELECT 1 FROM auth.permissions p WHERE p.name = 'users:assign_parent');

INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, p.id
FROM auth.permissions p
WHERE p.name = 'users:assign_parent'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = '00000000-0000-0000-0000-000000000001'::uuid
        AND rp.permission_id = p.id
  );
