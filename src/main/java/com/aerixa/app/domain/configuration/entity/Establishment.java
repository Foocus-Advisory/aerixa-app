package com.aerixa.app.domain.configuration.entity;

import com.aerixa.app.domain.shared.entity.SoftDeletableEntity;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "establishments", schema = "auth")
@Data
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@SQLDelete(sql = "UPDATE auth.establishments SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class Establishment extends SoftDeletableEntity {

    @Column(nullable = false, unique = true, length = 100)
    private String code;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "short_name", length = 120)
    private String shortName;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "establishment_status")
    private EstablishmentStatus status = EstablishmentStatus.ACTIVE;

    @Column(name = "address_line1", length = 255)
    private String addressLine1;

    @Column(name = "address_line2", length = 255)
    private String addressLine2;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String country;

    @Column(name = "whatsapp_phone_prefix", length = 10)
    private String whatsappPhonePrefix;

    @Column(name = "whatsapp_phone", length = 20)
    private String whatsappPhone;

    @Column(name = "other_phone_prefix", length = 10)
    private String otherPhonePrefix;

    @Column(name = "other_phone", length = 20)
    private String otherPhone;

    @Column(length = 255)
    private String email;

    @Column(name = "logo_file", columnDefinition = "bytea")
    private byte[] logoFile;

    @Column(name = "logo_content_type", length = 120)
    private String logoContentType;

    @Column(name = "logo_filename", length = 255)
    private String logoFilename;

    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    public enum EstablishmentStatus {
        ACTIVE,
        INACTIVE
    }

    public boolean hasLogo() {
        return logoFile != null && logoFile.length > 0;
    }
}
