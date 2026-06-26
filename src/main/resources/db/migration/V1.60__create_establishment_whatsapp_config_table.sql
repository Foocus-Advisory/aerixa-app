-- V1.60__create_establishment_whatsapp_config_table.sql
-- Configuration WhatsApp Business par etablissement (Modele B: saisie manuelle)
-- + permissions associees

-- 1) establishment_whatsapp_configs
CREATE TABLE IF NOT EXISTS auth.establishment_whatsapp_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID NOT NULL,
    waba_id VARCHAR(255),
    phone_number_id VARCHAR(255),
    display_phone_number VARCHAR(30),
    access_token_ciphertext TEXT,
    encryption_key_ciphertext TEXT NOT NULL,
    webhook_verify_token VARCHAR(255) NOT NULL,
    connection_status VARCHAR(30) NOT NULL DEFAULT 'NOT_CONFIGURED',
    last_synced_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID,
    created_by_label VARCHAR(255),
    updated_by_user_id UUID,
    updated_by_label VARCHAR(255),
    CONSTRAINT fk_establishment_whatsapp_configs_establishment
        FOREIGN KEY (establishment_id)
        REFERENCES auth.establishments(id),
    CONSTRAINT uq_establishment_whatsapp_configs_establishment
        UNIQUE (establishment_id),
    CONSTRAINT uq_establishment_whatsapp_configs_phone_number_id
        UNIQUE (phone_number_id),
    CONSTRAINT ck_establishment_whatsapp_configs_connection_status
        CHECK (connection_status IN ('NOT_CONFIGURED', 'PENDING_VERIFICATION', 'ACTIVE', 'ERROR'))
);

-- 2) Seed idempotent des permissions
WITH new_perms(name, description, module, action) AS (
    VALUES
        ('establishment_whatsapp_config:read', 'Lire la configuration WhatsApp d un etablissement', 'establishment_whatsapp_config', 'read'),
        ('establishment_whatsapp_config:update', 'Mettre a jour la configuration WhatsApp d un etablissement', 'establishment_whatsapp_config', 'update')
)
INSERT INTO auth.permissions (name, description, module, action)
SELECT p.name, p.description, p.module, p.action
FROM new_perms p
WHERE NOT EXISTS (
    SELECT 1 FROM auth.permissions ep WHERE ep.name = p.name
);

-- 3) Assigner les permissions a SUPER_ADMIN
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'SUPER_ADMIN'
  AND p.module = 'establishment_whatsapp_config'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 4) Assigner les permissions a ADMIN
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'ADMIN'
  AND p.module = 'establishment_whatsapp_config'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
