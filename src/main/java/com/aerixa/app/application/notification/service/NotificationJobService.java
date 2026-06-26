package com.aerixa.app.application.notification.service;

import com.aerixa.app.domain.notification.entity.NotificationJob;
import com.aerixa.app.domain.notification.entity.NotificationJobStatus;
import com.aerixa.app.domain.notification.entity.NotificationJobType;
import com.aerixa.app.infrastructure.notification.repository.NotificationJobJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationJobService {

    private static final int DEFAULT_MAX_ATTEMPTS = 5;

    private final NotificationJobJpaRepository notificationJobJpaRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public NotificationJob enqueue(UUID establishmentId, NotificationJobType jobType, Map<String, Object> payload) {
        if (establishmentId == null || jobType == null) {
            throw new IllegalArgumentException("establishmentId et jobType sont obligatoires");
        }

        NotificationJob job = NotificationJob.builder()
                .establishmentId(establishmentId)
                .jobType(jobType)
                .payload(serializePayload(payload))
                .status(NotificationJobStatus.PENDING)
                .attempts(0)
                .maxAttempts(DEFAULT_MAX_ATTEMPTS)
                .nextAttemptAt(LocalDateTime.now())
                .build();

        return notificationJobJpaRepository.save(job);
    }

    private String serializePayload(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload == null ? Map.of() : payload);
        } catch (Exception e) {
            throw new IllegalStateException("Impossible de serialiser le payload de notification", e);
        }
    }
}
