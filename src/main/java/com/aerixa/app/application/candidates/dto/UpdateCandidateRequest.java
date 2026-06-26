package com.aerixa.app.application.candidates.dto;

import com.aerixa.app.domain.candidates.entity.CandidateGender;
import com.aerixa.app.domain.candidates.entity.WhatsappTarget;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateCandidateRequest {
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
    private UUID assignedOperatorId;
}
