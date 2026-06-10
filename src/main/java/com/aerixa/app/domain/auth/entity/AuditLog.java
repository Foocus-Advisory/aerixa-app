package com.aerixa.app.domain.auth.entity;

import com.aerixa.app.domain.shared.entity.SoftDeletableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_logs", schema = "auth")
@Data
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@SQLDelete(sql = "UPDATE auth.audit_logs SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class AuditLog extends SoftDeletableEntity {

    @Column(name = "correlation_id", length = 100)
    private String correlationId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = true)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = true)
    private Session session;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "audit_action")
    private AuditAction action;

    @Column(name = "entity_type", length = 50)
    private String entityType;

    @Column(name = "entity_id")
    private UUID entityId;

    @Column(name = "resource_path", length = 500)
    private String resourcePath;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "actor_roles", columnDefinition = "jsonb")
    private String actorRoles;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "outcome", nullable = false, columnDefinition = "audit_outcome")
    private AuditOutcome outcome = AuditOutcome.SUCCESS;

    @Column(name = "reason_code", length = 100)
    private String reasonCode;

    @CreationTimestamp
    @Column(nullable = false)
    private LocalDateTime timestamp;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String details;

    @Column(name = "status_code")
    private Integer statusCode;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "establishment_id")
    private UUID establishmentId;

    public enum AuditAction {
        LOGIN, LOGOUT, REFRESH, REVOKED, EXPIRED, CONFLICT, CREATE, UPDATE, DELETE, READ
    }

    public enum AuditOutcome {
        SUCCESS, FAILURE
    }
}
