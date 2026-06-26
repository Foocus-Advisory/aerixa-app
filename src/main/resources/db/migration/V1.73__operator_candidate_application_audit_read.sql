-- V1.73__operator_candidate_application_audit_read.sql
-- OPERATOR doit pouvoir consulter la trace d'audit de ses propres candidatures
-- (qui a fait quoi, quand) en complement de candidate_applications:history.
-- Cela complete le perimetre metier deja accorde par V1.68 (candidats/candidatures/
-- notes/pieces jointes/conversations) et V1.72 (lecture des referentiels de pipeline).
--
-- Volontairement exclu de ce perimetre (reserve ADMIN/SUPER_ADMIN) :
--   - candidates:hard_delete (suppression definitive irreversible)
--   - candidates:assign_operator (reaffectation a un autre operateur)

INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'OPERATOR'
  AND p.name = 'candidate_application_audit:read'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
