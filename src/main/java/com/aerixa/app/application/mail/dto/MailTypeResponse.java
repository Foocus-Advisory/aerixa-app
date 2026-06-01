package com.aerixa.app.application.mail.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO réponse pour un type de mail
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MailTypeResponse {
    private UUID id;
    private String code;
    private String category;
    private String name;
    private String description;
    private String defaultRecipient;
    private Boolean active;
    private Long minResendIntervalSeconds;
    private Integer maxRetries;
    private Boolean showSystemComments;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
