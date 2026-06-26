-- V1.61__create_candidate_conversations_tables.sql
-- Module Candidats: candidate_conversations, candidate_conversation_messages + permissions

-- 1) candidate_conversations
CREATE TABLE IF NOT EXISTS auth.candidate_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID NOT NULL,
    candidate_id UUID,
    target_phone_number VARCHAR(30) NOT NULL,
    target_phone_owner VARCHAR(20) NOT NULL,
    last_inbound_at TIMESTAMP NULL,
    last_outbound_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_candidate_conversations_establishment
        FOREIGN KEY (establishment_id)
        REFERENCES auth.establishments(id),
    CONSTRAINT fk_candidate_conversations_candidate
        FOREIGN KEY (candidate_id)
        REFERENCES auth.candidates(id),
    CONSTRAINT ck_candidate_conversations_target_phone_owner
        CHECK (target_phone_owner IN ('PARENT_1', 'PARENT_2', 'CANDIDATE'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_candidate_conversations_establishment_phone
    ON auth.candidate_conversations(establishment_id, target_phone_number);

CREATE INDEX IF NOT EXISTS idx_candidate_conversations_candidate
    ON auth.candidate_conversations(candidate_id);

CREATE INDEX IF NOT EXISTS idx_candidate_conversations_establishment_unidentified
    ON auth.candidate_conversations(establishment_id)
    WHERE candidate_id IS NULL;

-- 2) candidate_conversation_messages
CREATE TABLE IF NOT EXISTS auth.candidate_conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL,
    direction VARCHAR(10) NOT NULL,
    sender_user_id UUID,
    whatsapp_message_id VARCHAR(255),
    message_type VARCHAR(20) NOT NULL,
    template_name VARCHAR(255),
    content_ciphertext TEXT NOT NULL,
    content_preview_hash VARCHAR(255),
    media_url VARCHAR(500),
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ccm_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES auth.candidate_conversations(id),
    CONSTRAINT fk_ccm_sender
        FOREIGN KEY (sender_user_id)
        REFERENCES auth.users(id),
    CONSTRAINT ck_ccm_direction
        CHECK (direction IN ('OUTBOUND', 'INBOUND')),
    CONSTRAINT ck_ccm_message_type
        CHECK (message_type IN ('TEXT', 'TEMPLATE', 'MEDIA', 'SYSTEM')),
    CONSTRAINT ck_ccm_delivery_status
        CHECK (delivery_status IN ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_ccm_conversation_occurred_at
    ON auth.candidate_conversation_messages(conversation_id, occurred_at);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ccm_whatsapp_message_id
    ON auth.candidate_conversation_messages(whatsapp_message_id)
    WHERE whatsapp_message_id IS NOT NULL;

-- 3) Seed idempotent des permissions
WITH new_perms(name, description, module, action) AS (
    VALUES
        ('candidate_conversations:read', 'Lire les conversations WhatsApp d un candidat', 'candidate_conversations', 'read'),
        ('candidate_conversations:list', 'Lister les conversations WhatsApp', 'candidate_conversations', 'list'),
        ('candidate_conversations:send_message', 'Envoyer un message WhatsApp', 'candidate_conversations', 'send_message')
)
INSERT INTO auth.permissions (name, description, module, action)
SELECT p.name, p.description, p.module, p.action
FROM new_perms p
WHERE NOT EXISTS (
    SELECT 1 FROM auth.permissions ep WHERE ep.name = p.name
);

-- 4) Assigner les permissions a SUPER_ADMIN et ADMIN
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name IN ('SUPER_ADMIN', 'ADMIN')
  AND p.module = 'candidate_conversations'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
