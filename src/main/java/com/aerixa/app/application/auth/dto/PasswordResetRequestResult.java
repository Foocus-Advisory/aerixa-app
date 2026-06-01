package com.aerixa.app.application.auth.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasswordResetRequestResult {
    private boolean accepted;
    private boolean queued;
    private String jobId;
    private String recipient;
    private String fallbackRecipient;
}
