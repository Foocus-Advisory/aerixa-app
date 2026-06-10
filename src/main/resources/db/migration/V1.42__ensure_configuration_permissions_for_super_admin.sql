-- V1.42__ensure_configuration_permissions_for_super_admin.sql
-- Vérifie que TOUTES les permissions de configuration existent et sont assignées à SUPER_ADMIN et ADMIN
-- Cette migration sert de sécurité pour s'assurer que les permissions de configuration
-- sont correctement assignées même si elles ont été créées avant

-- 1) S'assurer que toutes les permissions de configuration existent
WITH config_permissions(name, description, module, action) AS (
    VALUES
        ('establishments:create', 'Creer un etablissement', 'establishments', 'create'),
        ('establishments:read', 'Lire un etablissement', 'establishments', 'read'),
        ('establishments:list', 'Lister les etablissements autorises', 'establishments', 'list'),
        ('establishments:update', 'Mettre a jour un etablissement', 'establishments', 'update'),
        ('establishments:activate', 'Activer un etablissement', 'establishments', 'activate'),
        ('establishments:deactivate', 'Desactiver un etablissement', 'establishments', 'deactivate'),
        
        ('entry_diplomas:create', 'Creer un diplome d''entree', 'entry_diplomas', 'create'),
        ('entry_diplomas:read', 'Lire un diplome d''entree', 'entry_diplomas', 'read'),
        ('entry_diplomas:list', 'Lister les diplomes d''entree', 'entry_diplomas', 'list'),
        ('entry_diplomas:update', 'Mettre a jour un diplome d''entree', 'entry_diplomas', 'update'),
        ('entry_diplomas:delete', 'Supprimer un diplome d''entree', 'entry_diplomas', 'delete'),
        ('entry_diplomas:activate', 'Activer un diplome d''entree', 'entry_diplomas', 'activate'),
        ('entry_diplomas:deactivate', 'Desactiver un diplome d''entree', 'entry_diplomas', 'deactivate'),
        
        ('academic_levels:create', 'Creer un niveau academique', 'academic_levels', 'create'),
        ('academic_levels:read', 'Lire un niveau academique', 'academic_levels', 'read'),
        ('academic_levels:list', 'Lister les niveaux academiques', 'academic_levels', 'list'),
        ('academic_levels:update', 'Mettre a jour un niveau academique', 'academic_levels', 'update'),
        ('academic_levels:delete', 'Supprimer un niveau academique', 'academic_levels', 'delete'),
        ('academic_levels:activate', 'Activer un niveau academique', 'academic_levels', 'activate'),
        ('academic_levels:deactivate', 'Desactiver un niveau academique', 'academic_levels', 'deactivate'),
        
        ('program_tracks:create', 'Creer une filiere', 'program_tracks', 'create'),
        ('program_tracks:read', 'Lire une filiere', 'program_tracks', 'read'),
        ('program_tracks:list', 'Lister les filieres', 'program_tracks', 'list'),
        ('program_tracks:update', 'Mettre a jour une filiere', 'program_tracks', 'update'),
        ('program_tracks:delete', 'Supprimer une filiere', 'program_tracks', 'delete'),
        ('program_tracks:activate', 'Activer une filiere', 'program_tracks', 'activate'),
        ('program_tracks:deactivate', 'Desactiver une filiere', 'program_tracks', 'deactivate'),
        
        ('program_track_levels:create', 'Creer une association filiere-niveau', 'program_track_levels', 'create'),
        ('program_track_levels:read', 'Lire une association filiere-niveau', 'program_track_levels', 'read'),
        ('program_track_levels:list', 'Lister les associations filiere-niveau', 'program_track_levels', 'list'),
        ('program_track_levels:update', 'Mettre a jour une association filiere-niveau', 'program_track_levels', 'update'),
        ('program_track_levels:delete', 'Supprimer une association filiere-niveau', 'program_track_levels', 'delete'),
        ('program_track_levels:activate', 'Activer une association filiere-niveau', 'program_track_levels', 'activate'),
        ('program_track_levels:deactivate', 'Desactiver une association filiere-niveau', 'program_track_levels', 'deactivate'),
        
        ('acquisition_channels:create', 'Creer un canal d''acquisition', 'acquisition_channels', 'create'),
        ('acquisition_channels:read', 'Lire un canal d''acquisition', 'acquisition_channels', 'read'),
        ('acquisition_channels:list', 'Lister les canaux d''acquisition', 'acquisition_channels', 'list'),
        ('acquisition_channels:update', 'Mettre a jour un canal d''acquisition', 'acquisition_channels', 'update'),
        ('acquisition_channels:delete', 'Supprimer un canal d''acquisition', 'acquisition_channels', 'delete'),
        ('acquisition_channels:activate', 'Activer un canal d''acquisition', 'acquisition_channels', 'activate'),
        ('acquisition_channels:deactivate', 'Desactiver un canal d''acquisition', 'acquisition_channels', 'deactivate'),
        
        ('funnel_stages:create', 'Creer une etape de funnel', 'funnel_stages', 'create'),
        ('funnel_stages:read', 'Lire une etape de funnel', 'funnel_stages', 'read'),
        ('funnel_stages:list', 'Lister les etapes de funnel', 'funnel_stages', 'list'),
        ('funnel_stages:update', 'Mettre a jour une etape de funnel', 'funnel_stages', 'update'),
        ('funnel_stages:delete', 'Supprimer une etape de funnel', 'funnel_stages', 'delete'),
        ('funnel_stages:activate', 'Activer une etape de funnel', 'funnel_stages', 'activate'),
        ('funnel_stages:deactivate', 'Desactiver une etape de funnel', 'funnel_stages', 'deactivate'),
        
        ('funnel_stage_transitions:create', 'Creer une transition de funnel', 'funnel_stage_transitions', 'create'),
        ('funnel_stage_transitions:read', 'Lire une transition de funnel', 'funnel_stage_transitions', 'read'),
        ('funnel_stage_transitions:list', 'Lister les transitions de funnel', 'funnel_stage_transitions', 'list'),
        ('funnel_stage_transitions:update', 'Mettre a jour une transition de funnel', 'funnel_stage_transitions', 'update'),
        ('funnel_stage_transitions:delete', 'Supprimer une transition de funnel', 'funnel_stage_transitions', 'delete'),
        ('funnel_stage_transitions:activate', 'Activer une transition de funnel', 'funnel_stage_transitions', 'activate'),
        ('funnel_stage_transitions:deactivate', 'Desactiver une transition de funnel', 'funnel_stage_transitions', 'deactivate'),
        
        ('pipeline_view_preference:read', 'Lire la preference de vue pipeline', 'pipeline_view_preference', 'read'),
        ('pipeline_view_preference:update', 'Mettre a jour la preference de vue pipeline', 'pipeline_view_preference', 'update')
)
INSERT INTO auth.permissions (name, description, module, action)
SELECT cp.name, cp.description, cp.module, cp.action
FROM config_permissions cp
WHERE NOT EXISTS (
    SELECT 1
    FROM auth.permissions p
    WHERE p.name = cp.name AND p.deleted_at IS NULL
);

-- 2) Assigner toutes les permissions configuration a SUPER_ADMIN (s'il en manque)
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'SUPER_ADMIN'
  AND p.module IN ('establishments', 'entry_diplomas', 'academic_levels', 'program_tracks', 'program_track_levels', 'acquisition_channels', 'funnel_stages', 'funnel_stage_transitions', 'pipeline_view_preference')
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 3) Assigner les permissions configuration a ADMIN (s'il en manque)
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'ADMIN'
  AND p.module IN ('establishments', 'entry_diplomas', 'academic_levels', 'program_tracks', 'program_track_levels', 'acquisition_channels', 'funnel_stages', 'funnel_stage_transitions', 'pipeline_view_preference')
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 4) Nettoyer SUPERVISOR et OPERATOR (ne pas avoir de permissions admin de configuration)
DELETE FROM auth.role_permissions rp
USING auth.roles r, auth.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name IN ('SUPERVISOR', 'OPERATOR')
  AND p.module IN ('establishments', 'entry_diplomas', 'academic_levels', 'program_tracks', 'program_track_levels', 'acquisition_channels', 'funnel_stages', 'funnel_stage_transitions', 'pipeline_view_preference')
  AND p.action NOT IN ('read');  -- SUPERVISOR peut lire les config

-- 5) Assigner seulement la permission read a SUPERVISOR
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'SUPERVISOR'
  AND p.module IN ('establishments', 'entry_diplomas', 'academic_levels', 'program_tracks', 'program_track_levels', 'acquisition_channels', 'funnel_stages', 'funnel_stage_transitions', 'pipeline_view_preference')
  AND p.action = 'read'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
