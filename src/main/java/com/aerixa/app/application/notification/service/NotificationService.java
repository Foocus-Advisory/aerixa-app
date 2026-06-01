package com.aerixa.app.application.notification.service;

import com.aerixa.app.application.auth.dto.PagedResponse;
import com.aerixa.app.application.notification.dto.NotificationBulkActionResponse;
import com.aerixa.app.application.notification.dto.NotificationBulkDeleteRequest;
import com.aerixa.app.application.notification.dto.NotificationBulkReadStatusRequest;
import com.aerixa.app.application.notification.dto.NotificationResponse;
import com.aerixa.app.application.notification.dto.NotificationUnreadCountResponse;
import com.aerixa.app.domain.notification.entity.Notification;
import com.aerixa.app.infrastructure.notification.repository.NotificationJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationJpaRepository notificationJpaRepository;

    @Transactional(readOnly = true)
    public PagedResponse<NotificationResponse> listUserNotifications(UUID userId, int page, int size, String readStatus) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by("createdAt").descending());

        Page<Notification> notifications = switch (normalizeReadStatus(readStatus)) {
            case "READ" -> notificationJpaRepository.findByUserIdAndRead(userId, true, pageable);
            case "UNREAD" -> notificationJpaRepository.findByUserIdAndRead(userId, false, pageable);
            default -> notificationJpaRepository.findByUserId(userId, pageable);
        };

        return PagedResponse.<NotificationResponse>builder()
                .content(notifications.getContent().stream().map(this::toResponse).toList())
                .page(notifications.getNumber())
                .size(notifications.getSize())
                .totalElements(notifications.getTotalElements())
                .totalPages(notifications.getTotalPages())
                .build();
    }

    @Transactional(readOnly = true)
    public NotificationUnreadCountResponse getUnreadCount(UUID userId) {
        return NotificationUnreadCountResponse.builder()
                .unreadCount(notificationJpaRepository.countUnreadByUserId(userId))
                .build();
    }

    @Transactional
    public NotificationResponse updateReadStatus(UUID userId, UUID notificationId, boolean read) {
        Notification notification = notificationJpaRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Notification introuvable"));

        notification.setRead(read);
        notification.setReadAt(read ? LocalDateTime.now() : null);

        return toResponse(notificationJpaRepository.save(notification));
    }

    @Transactional
    public NotificationBulkActionResponse updateBulkReadStatus(UUID userId, NotificationBulkReadStatusRequest request) {
        if (request == null || request.getIds() == null || request.getIds().isEmpty()) {
            throw new IllegalArgumentException("La liste des notifications est obligatoire");
        }
        if (request.getRead() == null) {
            throw new IllegalArgumentException("Le statut de lecture est obligatoire");
        }

        LocalDateTime readAt = request.getRead() ? LocalDateTime.now() : null;
        int affected = notificationJpaRepository.updateReadStatusBulk(userId, request.getIds(), request.getRead(), readAt);

        return NotificationBulkActionResponse.builder()
                .affectedCount(affected)
                .build();
    }

    @Transactional
    public void deleteNotification(UUID userId, UUID notificationId) {
        Notification notification = notificationJpaRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Notification introuvable"));
        notificationJpaRepository.delete(notification);
    }

    @Transactional
    public NotificationBulkActionResponse deleteBulkNotifications(UUID userId, NotificationBulkDeleteRequest request) {
        if (request == null || request.getIds() == null || request.getIds().isEmpty()) {
            throw new IllegalArgumentException("La liste des notifications est obligatoire");
        }

        List<Notification> notifications = notificationJpaRepository.findAllByUserIdAndIdIn(userId, request.getIds());
        notificationJpaRepository.deleteAll(notifications);

        return NotificationBulkActionResponse.builder()
                .affectedCount(notifications.size())
                .build();
    }

    private String normalizeReadStatus(String readStatus) {
        if (readStatus == null || readStatus.isBlank()) {
            return "ALL";
        }
        String normalized = readStatus.trim().toUpperCase();
        if (!normalized.equals("ALL") && !normalized.equals("READ") && !normalized.equals("UNREAD")) {
            throw new IllegalArgumentException("readStatus invalide: " + readStatus);
        }
        return normalized;
    }

    private NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .description(notification.getDescription())
                .notificationType(notification.getNotificationType())
                .read(Boolean.TRUE.equals(notification.getRead()))
                .readAt(notification.getReadAt())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
