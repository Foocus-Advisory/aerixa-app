-- V1.68__operator_candidates_access_permissions.sql
-- OPERATOR doit pouvoir gerer les candidats/candidatures de l'etablissement de son
-- ADMIN parent (menu Candidats). Le retrait de audit_logs:read pour OPERATOR est gere
-- separement par V1.67__remove_operator_audit_logs_permission.sql.

-- Accorder a OPERATOR l'acces complet aux candidats et candidatures, a l'exception de la
-- suppression definitive (hard_delete) et de l'audit de candidature, reserves a
-- ADMIN/SUPER_ADMIN.
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'OPERATOR'
  AND p.name IN (
      'candidates:create',
      'candidates:read',
      'candidates:list',
      'candidates:update',
      'candidates:delete',
      'candidates:activate',
      'candidates:deactivate',
      'candidates:export',
      'candidates:import',
      'candidate_applications:create',
      'candidate_applications:read',
      'candidate_applications:list',
      'candidate_applications:transition',
      'candidate_applications:history',
      'candidate_notes:create',
      'candidate_notes:list',
      'candidate_notes:update',
      'candidate_notes:delete',
      'candidate_attachments:create',
      'candidate_attachments:read',
      'candidate_attachments:delete',
      'candidate_conversations:read',
      'candidate_conversations:list',
      'candidate_conversations:send_message',
      'candidate_conversations:create'
  )
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
