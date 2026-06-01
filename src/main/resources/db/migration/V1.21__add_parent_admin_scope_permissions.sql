-- V1.21__add_parent_admin_scope_permissions.sql
-- Ajoute la relation parent ADMIN -> OPERATOR et les permissions de scope lecture

ALTER TABLE auth.users
    ADD COLUMN IF NOT EXISTS parent_admin_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'auth'
          AND table_name = 'users'
          AND constraint_name = 'fk_users_parent_admin'
    ) THEN
        ALTER TABLE auth.users
            ADD CONSTRAINT fk_users_parent_admin
            FOREIGN KEY (parent_admin_id) REFERENCES auth.users(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_parent_admin_id
    ON auth.users(parent_admin_id);

INSERT INTO auth.permissions (name, description, module, action)
SELECT 'users:read_all', 'Lire tous les utilisateurs', 'users', 'read_all'
WHERE NOT EXISTS (SELECT 1 FROM auth.permissions p WHERE p.name = 'users:read_all');

INSERT INTO auth.permissions (name, description, module, action)
SELECT 'users:read_children', 'Lire les opérateurs enfants de l''admin', 'users', 'read_children'
WHERE NOT EXISTS (SELECT 1 FROM auth.permissions p WHERE p.name = 'users:read_children');

INSERT INTO auth.permissions (name, description, module, action)
SELECT 'sessions:read_all', 'Lire toutes les sessions', 'sessions', 'read_all'
WHERE NOT EXISTS (SELECT 1 FROM auth.permissions p WHERE p.name = 'sessions:read_all');

INSERT INTO auth.permissions (name, description, module, action)
SELECT 'sessions:read_children', 'Lire les sessions des opérateurs enfants', 'sessions', 'read_children'
WHERE NOT EXISTS (SELECT 1 FROM auth.permissions p WHERE p.name = 'sessions:read_children');

INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, p.id
FROM auth.permissions p
WHERE p.name IN ('users:read_all', 'sessions:read_all')
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = '00000000-0000-0000-0000-000000000001'::uuid
        AND rp.permission_id = p.id
  );

INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002'::uuid, p.id
FROM auth.permissions p
WHERE p.name IN ('users:read_children', 'sessions:read_children')
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = '00000000-0000-0000-0000-000000000002'::uuid
        AND rp.permission_id = p.id
  );

-- Réassigner users:create à ADMIN si nécessaire (contrainte métier gérée côté service)
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002'::uuid, p.id
FROM auth.permissions p
WHERE p.name = 'users:create'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = '00000000-0000-0000-0000-000000000002'::uuid
        AND rp.permission_id = p.id
  );
