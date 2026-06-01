package com.aerixa.app.application.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserStatusStatsResponse {
    private long total;
    private long active;
    private long disabled;
    private long pendingVerification;
    private long deleted;
}
