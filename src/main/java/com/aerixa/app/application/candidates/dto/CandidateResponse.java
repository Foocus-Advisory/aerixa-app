package com.aerixa.app.application.candidates.dto;

import com.aerixa.app.domain.candidates.entity.CandidateGender;
import com.aerixa.app.domain.candidates.entity.CandidateStatus;
import com.aerixa.app.domain.candidates.entity.WhatsappTarget;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateResponse {
    private UUID id;
    private UUID establishmentId;
    private String firstName;
    private String lastName;
    private String parentPhone1;
    private String parentPhone2;
    private String candidatePhone;
    private String email;
    private UUID acquisitionChannelId;
    private UUID entryDiplomaId;
    private String previousSchool;
    private String addressLine;
    private String city;
    private String country;
    private LocalDate dateOfBirth;
    private CandidateGender gender;
    private String observations;
    private WhatsappTarget preferredWhatsappTarget;
    private CandidateStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdByUserId;
    private String createdByLabel;
    private UUID updatedByUserId;
    private String updatedByLabel;
}
