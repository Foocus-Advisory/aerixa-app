-- V1.11__seed_permissions_auth_module.sql
-- Seed des permissions du module Auth/RBAC

-- Users Management
INSERT INTO auth.permissions (name, description, module, action) VALUES
('users:read', 'Consulter un utilisateur ou la liste', 'users', 'read'),
('users:create', 'Créer un utilisateur', 'users', 'create'),
('users:edit', 'Modifier profil/infos d''un utilisateur', 'users', 'edit'),
('users:delete', 'Hard delete un utilisateur', 'users', 'delete'),
('users:toggle_active', 'Activer/suspendre un utilisateur', 'users', 'toggle_active'),
('users:reset_password', 'Initialiser reset password token + envoi mail', 'users', 'reset_password'),
('users:revoke_sessions', 'Révoquer toutes les sessions d''un utilisateur', 'users', 'revoke_sessions'),
('users:view_audit_log', 'Voir l''historique des actions d''un utilisateur', 'users', 'view_audit_log'),
('users:manage_roles', 'Assigner/retirer des rôles à un utilisateur', 'users', 'manage_roles');

-- Roles Management
INSERT INTO auth.permissions (name, description, module, action) VALUES
('roles:read', 'Consulter un rôle ou la liste', 'roles', 'read'),
('roles:create', 'Créer un rôle', 'roles', 'create'),
('roles:edit', 'Modifier un rôle', 'roles', 'edit'),
('roles:delete', 'Supprimer un rôle', 'roles', 'delete'),
('roles:manage_permissions', 'Assigner/retirer des permissions à un rôle', 'roles', 'manage_permissions');

-- Permissions
INSERT INTO auth.permissions (name, description, module, action) VALUES
('permissions:read', 'Consulter permissions disponibles', 'permissions', 'read');

-- Sessions Management
INSERT INTO auth.permissions (name, description, module, action) VALUES
('sessions:read', 'Voir les sessions actives d''un utilisateur ou globales', 'sessions', 'read'),
('sessions:revoke', 'Révoquer une session spécifique', 'sessions', 'revoke');

-- Audit Logs
INSERT INTO auth.permissions (name, description, module, action) VALUES
('audit_logs:read', 'Consulter les logs d''audit', 'audit_logs', 'read');

-- Email Templates
INSERT INTO auth.permissions (name, description, module, action) VALUES
('email_templates:read', 'Consulter les templates disponibles', 'email_templates', 'read'),
('email_templates:create', 'Créer un template', 'email_templates', 'create'),
('email_templates:edit', 'Modifier un template', 'email_templates', 'edit'),
('email_templates:delete', 'Supprimer un template', 'email_templates', 'delete'),
('email_templates:test', 'Envoyer un test du template', 'email_templates', 'test');
