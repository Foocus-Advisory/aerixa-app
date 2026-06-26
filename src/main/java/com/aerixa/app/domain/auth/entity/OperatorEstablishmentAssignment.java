package com.aerixa.app.domain.auth.entity;

import com.aerixa.app.domain.shared.entity.SoftDeletableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.util.UUID;

@Entity
@Table(name = "operator_establishment_assignments", schema = "auth")
@Data
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@SQLDelete(sql = "UPDATE auth.operator_establishment_assignments SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class OperatorEstablishmentAssignment extends SoftDeletableEntity {

    @Column(name = "operator_user_id", nullable = false)
    private UUID operatorUserId;

    @Column(name = "establishment_id", nullable = false)
    private UUID establishmentId;

    @Column(name = "assigned_by_user_id", nullable = false)
    private UUID assignedByUserId;
}
