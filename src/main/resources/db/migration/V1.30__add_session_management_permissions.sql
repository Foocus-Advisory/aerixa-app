-- V1.30__add_session_management_permissions.sql
-- Ajoute les permissions explicites pour la gestion personnelle des sessions
-- et renforce la distinction entre lecture/revocation propre/ajena.

INSERT INTO auth.permissions (name, description, module, action)
SELECT 'sessions:read_own', 'Lire ses propres sessions actives', 'sessions', 'read_own'
WHERE NOT EXISTS (SELECT 1 FROM auth.permissions p WHERE p.name = 'sessions:read_own');

INSERT INTO auth.permissions (name, description, module, action)
SELECT 'sessions:revoke_own', 'Révoquer une de ses propres sessions', 'sessions', 'revoke_own'
WHERE NOT EXISTS (SELECT 1 FROM auth.permissions p WHERE p.name = 'sessions:revoke_own');

INSERT INTO auth.permissions (name, description, module, action)
SELECT 'sessions:revoke_others', 'Révoquer toutes ses autres sessions', 'sessions', 'revoke_others'
WHERE NOT EXISTS (SELECT 1 FROM auth.permissions p WHERE p.name = 'sessions:revoke_others');

-- Assigner à tous les rôles (OPERATOR, SUPERVISOR, ADMIN, SUPER_ADMIN)
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE p.name IN ('sessions:read_own', 'sessions:revoke_own', 'sessions:revoke_others')
  AND p.deleted_at IS NULL
  AND r.name IN ('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN')
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
