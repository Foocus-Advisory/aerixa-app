-- V1.63__candidates_export_import_permissions.sql
-- Ajoute les permissions d'export et d'import Excel pour le module candidats

-- 1) Seed idempotent des nouvelles permissions
WITH new_perms(name, description, module, action) AS (
    VALUES
        ('candidates:export', 'Exporter les candidats en Excel', 'candidates', 'export'),
        ('candidates:import', 'Importer des candidats depuis Excel', 'candidates', 'import')
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
  AND p.name IN ('candidates:export', 'candidates:import')
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
  AND p.name IN ('candidates:export', 'candidates:import')
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
