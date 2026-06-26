-- V1.74__operator_entry_diplomas_read.sql
-- Complement de V1.72 : entry_diplomas avait ete omis du lot de referentiels en lecture
-- seule accordes a OPERATOR (necessaire pour afficher le diplome d'entree d'un candidat).

INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'OPERATOR'
  AND p.name IN ('entry_diplomas:list', 'entry_diplomas:read')
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
