-- V1.12__seed_roles.sql
-- Seed des rôles de base

-- SUPER_ADMIN (niveau 0)
INSERT INTO auth.roles (id, name, description, level, is_system) VALUES
('00000000-0000-0000-0000-000000000001'::uuid, 'SUPER_ADMIN', 'Super administrateur - accès total', 0, TRUE);

-- ADMIN (niveau 1)
INSERT INTO auth.roles (id, name, description, level, is_system) VALUES
('00000000-0000-0000-0000-000000000002'::uuid, 'ADMIN', 'Administrateur - gère les utilisateurs et rôles', 1, TRUE);

-- OPERATOR (niveau 2)
INSERT INTO auth.roles (id, name, description, level, is_system) VALUES
('00000000-0000-0000-0000-000000000003'::uuid, 'OPERATOR', 'Opérateur - accès limité', 2, TRUE);

-- Assigner toutes les permissions à SUPER_ADMIN
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id FROM auth.permissions WHERE deleted_at IS NULL;

-- Assigner permissions ADMIN à ADMIN
-- Users: read, create, edit (propre), toggle_active, reset_password, revoke_sessions, view_audit_log, manage_roles
-- Roles: read, create, edit, manage_permissions
-- Permissions: read
-- Sessions: read, revoke
-- Audit Logs: read
-- Email Templates: read, create, edit, delete, test
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002'::uuid, id FROM auth.permissions 
WHERE name IN (
    'users:read', 'users:create', 'users:edit', 'users:toggle_active', 
    'users:reset_password', 'users:revoke_sessions', 'users:view_audit_log', 
    'users:manage_roles',
    'roles:read', 'roles:create', 'roles:edit', 'roles:manage_permissions',
    'permissions:read',
    'sessions:read', 'sessions:revoke',
    'audit_logs:read',
    'email_templates:read', 'email_templates:create', 'email_templates:edit', 
    'email_templates:delete', 'email_templates:test'
) AND deleted_at IS NULL;

-- Assigner permissions OPERATOR à OPERATOR
-- Users: read (filtré), view_audit_log (propre)
-- Permissions: read
-- Sessions: read (propre), revoke (propre)
-- Audit Logs: read (propre)
-- Email Templates: read
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003'::uuid, id FROM auth.permissions 
WHERE name IN (
    'users:read',
    'permissions:read',
    'sessions:read', 'sessions:revoke',
    'audit_logs:read',
    'email_templates:read'
) AND deleted_at IS NULL;
