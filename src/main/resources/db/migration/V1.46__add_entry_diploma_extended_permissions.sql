-- V1.46__add_entry_diploma_extended_permissions.sql
-- Ajouter les permissions etendues pour le module entry_diplomas:
-- hard_delete, export, import

-- 1) Seed idempotent des nouvelles permissions
WITH new_perms(name, description, module, action) AS (
    VALUES
        ('entry_diplomas:hard_delete', 'Supprimer definitivement un diplome d''entree', 'entry_diplomas', 'hard_delete'),
        ('entry_diplomas:export',      'Exporter les diplomes d''entree en Excel',       'entry_diplomas', 'export'),
        ('entry_diplomas:import',      'Importer des diplomes d''entree depuis Excel',   'entry_diplomas', 'import')
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
  AND p.name IN ('entry_diplomas:hard_delete', 'entry_diplomas:export', 'entry_diplomas:import')
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
  AND p.name IN ('entry_diplomas:hard_delete', 'entry_diplomas:export', 'entry_diplomas:import')
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
