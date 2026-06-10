-- V1.52__program_tracks_extended_permissions.sql
-- Ajoute les permissions etendues pour le module program_tracks (hard_delete, export, import)

-- 1) Seed idempotent des nouvelles permissions
WITH new_perms(name, description, module, action) AS (
    VALUES
        ('program_tracks:hard_delete', 'Supprimer definitivement une filiere',       'program_tracks', 'hard_delete'),
        ('program_tracks:export',      'Exporter les filieres en Excel',              'program_tracks', 'export'),
        ('program_tracks:import',      'Importer des filieres depuis Excel',          'program_tracks', 'import')
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
      'program_tracks:hard_delete',
      'program_tracks:export',
      'program_tracks:import'
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
      'program_tracks:hard_delete',
      'program_tracks:export',
      'program_tracks:import'
  )
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
