-- V1.43__add_business_configuration_access_permission.sql
-- Ajoute une permission generique d'acces au module Business Configuration
-- Permet de controler l'acces au menu Business Configuration de manière simple

-- 1) Creer la permission generique d'acces
INSERT INTO auth.permissions (name, description, module, action)
SELECT 'business_configuration:access', 'Acceder au module Configuration metier', 'business_configuration', 'access'
WHERE NOT EXISTS (
    SELECT 1 FROM auth.permissions p
    WHERE p.name = 'business_configuration:access' AND p.deleted_at IS NULL
);

-- 2) Assigner la permission a SUPER_ADMIN
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'SUPER_ADMIN'
  AND p.name = 'business_configuration:access'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 3) Assigner la permission a ADMIN (peut egalement acceder)
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'ADMIN'
  AND p.name = 'business_configuration:access'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
