-- V1.65__restrict_super_admin_only_permissions.sql
-- Reserve la gestion des roles/permissions, des templates de mail et de la configuration
-- metier au seul role SUPER_ADMIN. ADMIN et OPERATOR gardaient ces droits par erreur
-- depuis le seed initial.

DELETE FROM auth.role_permissions rp
USING auth.roles r, auth.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name = 'ADMIN'
  AND p.name IN (
      'roles:read', 'roles:create', 'roles:edit', 'roles:manage_permissions',
      'permissions:read',
      'email_templates:read', 'email_templates:create', 'email_templates:edit',
      'email_templates:delete', 'email_templates:test',
      'business_configuration:access'
  );

DELETE FROM auth.role_permissions rp
USING auth.roles r, auth.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name = 'OPERATOR'
  AND p.name IN (
      'permissions:read',
      'email_templates:read'
  );
