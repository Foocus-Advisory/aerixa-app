-- V1.76__operator_acquisition_channels_read.sql
-- Complement de V1.72/V1.74 : acquisition_channels avait ete omis du lot de referentiels
-- en lecture seule accordes a OPERATOR. Indispensable pour creer un candidat, le champ
-- acquisitionChannelId etant obligatoire sur Candidate.

INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'OPERATOR'
  AND p.name IN ('acquisition_channels:list', 'acquisition_channels:read')
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
