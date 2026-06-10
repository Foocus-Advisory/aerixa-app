-- V1.53__acquisition_channels_extended_permissions.sql
-- Ajoute les permissions etendues pour le module acquisition_channels (hard_delete, export, import)

-- 1) Seed idempotent des nouvelles permissions
WITH new_perms(name, description, module, action) AS (
    VALUES
        ('acquisition_channels:hard_delete', 'Supprimer definitivement un canal d''acquisition', 'acquisition_channels', 'hard_delete'),
        ('acquisition_channels:export',      'Exporter les canaux d''acquisition en Excel',       'acquisition_channels', 'export'),
        ('acquisition_channels:import',      'Importer des canaux d''acquisition depuis Excel',   'acquisition_channels', 'import')
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
  AND p.name IN (
      'acquisition_channels:hard_delete',
      'acquisition_channels:export',
      'acquisition_channels:import'
  )
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
  AND p.name IN (
      'acquisition_channels:hard_delete',
      'acquisition_channels:export',
      'acquisition_channels:import'
  )
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
