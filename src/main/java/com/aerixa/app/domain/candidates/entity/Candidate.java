package com.aerixa.app.domain.candidates.entity;

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
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "candidates", schema = "auth")
@Data
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@SQLDelete(sql = "UPDATE auth.candidates SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class Candidate extends SoftDeletableEntity {

    @Column(name = "establishment_id", nullable = false)
    private UUID establishmentId;

    @Column(name = "first_name", nullable = false, length = 255)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 255)
    private String lastName;

    @Column(name = "parent_phone_1", length = 30)
    private String parentPhone1;

    @Column(name = "parent_phone_2", length = 30)
    private String parentPhone2;

    @Column(name = "candidate_phone", nullable = false, length = 30)
    private String candidatePhone;

    @Column(length = 255)
    private String email;

    @Column(name = "acquisition_channel_id", nullable = false)
    private UUID acquisitionChannelId;

    @Column(name = "entry_diploma_id", nullable = false)
    private UUID entryDiplomaId;

    @Column(name = "previous_school", length = 255)
    private String previousSchool;

    @Column(name = "address_line", length = 255)
    private String addressLine;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String country;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private CandidateGender gender;

    @Column(columnDefinition = "TEXT")
    private String observations;

    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_whatsapp_target", nullable = false, length = 20)
    private WhatsappTarget preferredWhatsappTarget;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CandidateStatus status;

    @Column(name = "assigned_operator_id")
    private UUID assignedOperatorId;
}
