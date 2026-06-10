package com.aerixa.app.domain.configuration.entity;

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
@Table(name = "program_track_levels", schema = "auth")
@Data
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@SQLDelete(sql = "UPDATE auth.program_track_levels SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class ProgramTrackLevel extends SoftDeletableEntity {

    @Column(name = "establishment_id", nullable = false)
    private UUID establishmentId;

    @Column(name = "program_track_id", nullable = false)
    private UUID programTrackId;

    @Column(name = "academic_level_id", nullable = false)
    private UUID academicLevelId;

    @Column(name = "is_open_for_application", nullable = false)
    private boolean openForApplication = true;
}
