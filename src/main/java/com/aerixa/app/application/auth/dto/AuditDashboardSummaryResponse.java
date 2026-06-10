package com.aerixa.app.application.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditDashboardSummaryResponse {
    private MetricWindowResponse refreshFailures;
    private MetricWindowResponse reuseAttempts;
    private MetricWindowResponse revokeSessions;
    private MetricWindowResponse loginFailures;
    private List<KeyValueCountResponse> loginFailuresBySourceIp;
    private List<ActorCountResponse> adminActionsByActor;
    private List<KeyValueCountResponse> topSourceIps;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MetricWindowResponse {
        private long last24h;
        private long last7d;
        private long last30d;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class KeyValueCountResponse {
        private String key;
        private long count;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ActorCountResponse {
        private UUID actorId;
        private String actorEmail;
        private long count;
    }
}
