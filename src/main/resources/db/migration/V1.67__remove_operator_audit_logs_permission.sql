-- V1.67__remove_operator_audit_logs_permission.sql
-- Retire l'acces au journal d'audit (sous-menu Parametres > Journal d'audit) pour le role OPERATOR.

DELETE FROM auth.role_permissions rp
USING auth.roles r, auth.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name = 'OPERATOR'
  AND p.name = 'audit_logs:read';
