-- V1.72__operator_read_only_pipeline_reference_data.sql
-- OPERATOR a besoin de consulter (lecture seule) les referentiels utilises par le pipeline
-- de candidatures (filieres, niveaux academiques, etapes/transitions du funnel) pour afficher
-- des libelles corrects sur ses candidats/candidatures, et de gerer sa propre preference
-- d'affichage du pipeline (Kanban/Table/Liste). Aucun droit de creation/modification/suppression
-- sur ces referentiels n'est accorde.

INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'OPERATOR'
  AND p.name IN (
      'program_tracks:list',
      'program_tracks:read',
      'academic_levels:list',
      'academic_levels:read',
      'program_track_levels:list',
      'program_track_levels:read',
      'funnel_stages:list',
      'funnel_stages:read',
      'funnel_stage_transitions:list',
      'funnel_stage_transitions:read',
      'pipeline_view_preference:read',
      'pipeline_view_preference:update'
  )
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
