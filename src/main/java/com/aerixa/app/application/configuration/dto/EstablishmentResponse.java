package com.aerixa.app.application.configuration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EstablishmentResponse {
    private UUID id;
    private String code;
    private String name;
    private String shortName;
    private String status;
    private String addressLine1;
    private String addressLine2;
    private String city;
    private String country;
    private String whatsappPhonePrefix;
    private String whatsappPhone;
    private String otherPhonePrefix;
    private String otherPhone;
    private String email;
    private String logoUrl;
    private UUID createdByUserId;
    private String createdByLabel;
    private UUID updatedByUserId;
    private String updatedByLabel;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
