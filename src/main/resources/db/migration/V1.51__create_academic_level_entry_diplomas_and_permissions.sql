-- V1.51__create_academic_level_entry_diplomas_and_permissions.sql
-- Cree la table de jointure academic_level <-> entry_diploma
-- et ajoute les permissions etendues pour le module academic_levels

-- 1) Table de jointure
CREATE TABLE IF NOT EXISTS auth.academic_level_entry_diplomas (
    academic_level_id UUID        NOT NULL REFERENCES auth.academic_levels(id) ON DELETE CASCADE,
    entry_diploma_id  UUID        NOT NULL REFERENCES auth.entry_diplomas(id)  ON DELETE CASCADE,
    attached_at       TIMESTAMP   NOT NULL DEFAULT NOW(),
    attached_by_user_id UUID,
    PRIMARY KEY (academic_level_id, entry_diploma_id)
);

CREATE INDEX IF NOT EXISTS idx_aled_academic_level_id ON auth.academic_level_entry_diplomas(academic_level_id);
CREATE INDEX IF NOT EXISTS idx_aled_entry_diploma_id  ON auth.academic_level_entry_diplomas(entry_diploma_id);

-- 2) Seed idempotent des nouvelles permissions
WITH new_perms(name, description, module, action) AS (
    VALUES
        ('academic_levels:hard_delete',           'Supprimer definitivement un niveau academique',        'academic_levels', 'hard_delete'),
        ('academic_levels:export',                 'Exporter les niveaux academiques en Excel',            'academic_levels', 'export'),
        ('academic_levels:import',                 'Importer des niveaux academiques depuis Excel',        'academic_levels', 'import'),
        ('academic_levels:attach_entry_diploma',   'Associer un diplome d''entree a un niveau academique', 'academic_levels', 'attach_entry_diploma'),
        ('academic_levels:detach_entry_diploma',   'Desassocier un diplome d''entree d''un niveau academique', 'academic_levels', 'detach_entry_diploma')
)
INSERT INTO auth.permissions (name, description, module, action)
SELECT p.name, p.description, p.module, p.action
FROM new_perms p
WHERE NOT EXISTS (
    SELECT 1 FROM auth.permissions ep WHERE ep.name = p.name
);

-- 3) Assigner a SUPER_ADMIN
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'SUPER_ADMIN'
  AND p.name IN (
      'academic_levels:hard_delete',
      'academic_levels:export',
      'academic_levels:import',
      'academic_levels:attach_entry_diploma',
      'academic_levels:detach_entry_diploma'
  )
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 4) Assigner a ADMIN
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'ADMIN'
  AND p.name IN (
      'academic_levels:hard_delete',
      'academic_levels:export',
      'academic_levels:import',
      'academic_levels:attach_entry_diploma',
      'academic_levels:detach_entry_diploma'
  )
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
