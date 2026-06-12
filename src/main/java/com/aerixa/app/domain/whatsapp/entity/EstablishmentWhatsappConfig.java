package com.aerixa.app.domain.whatsapp.entity;

import com.aerixa.app.domain.shared.entity.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "establishment_whatsapp_configs", schema = "auth")
@Data
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class EstablishmentWhatsappConfig extends AuditableEntity {

    @Column(name = "establishment_id", nullable = false, unique = true)
    private UUID establishmentId;

    @Column(name = "waba_id")
    private String wabaId;

    @Column(name = "phone_number_id", unique = true)
    private String phoneNumberId;

    @Column(name = "display_phone_number", length = 30)
    private String displayPhoneNumber;

    @Column(name = "access_token_ciphertext", columnDefinition = "TEXT")
    private String accessTokenCiphertext;

    @Column(name = "encryption_key_ciphertext", nullable = false, columnDefinition = "TEXT")
    private String encryptionKeyCiphertext;

    @Column(name = "webhook_verify_token", nullable = false)
    private String webhookVerifyToken;

    @Enumerated(EnumType.STRING)
    @Column(name = "connection_status", nullable = false, length = 30)
    private WhatsappConnectionStatus connectionStatus;

    @Column(name = "last_synced_at")
    private LocalDateTime lastSyncedAt;
}
