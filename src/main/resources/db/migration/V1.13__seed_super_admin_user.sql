-- V1.13__seed_super_admin_user.sql
-- Seed du compte SUPER_ADMIN initial

-- Le mot de passe temporaire: GeneratedStrong123!
-- Hash: $2a$12$... (sera généré via BCrypt dans le code, ici on met un placeholder)
-- Ce compte doit forcer le changement de mot de passe au 1er login

-- SUPER_ADMIN user
INSERT INTO auth.users (
    id,
    email,
    username,
    first_name,
    last_name,
    password_hash,
    status,
    email_verified,
    email_verified_at,
    must_change_password,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000099'::uuid,
    'foocus.advisory@gmail.com',
    'super_admin',
    'Super',
    'Admin',
    -- Password placeholder - sera remplacé au runtime via seed data loader
    '$2a$12$GeneratedStrong123PlaceholderHashWillBeReplacedAtRuntime',
    'ACTIVE',
    TRUE,
    CURRENT_TIMESTAMP,
    TRUE,
    CURRENT_TIMESTAMP
);

-- Assigner le rôle SUPER_ADMIN au user SUPER_ADMIN
INSERT INTO auth.user_roles (user_id, role_id, assigned_at)
VALUES (
    '00000000-0000-0000-0000-000000000099'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    CURRENT_TIMESTAMP
);
