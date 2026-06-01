package com.aerixa.app.infrastructure.notification.controller;

import com.aerixa.app.application.auth.dto.PagedResponse;
import com.aerixa.app.application.notification.dto.NotificationBulkActionResponse;
import com.aerixa.app.application.notification.dto.NotificationBulkDeleteRequest;
import com.aerixa.app.application.notification.dto.NotificationBulkReadStatusRequest;
import com.aerixa.app.application.notification.dto.NotificationReadStatusRequest;
import com.aerixa.app.application.notification.dto.NotificationResponse;
import com.aerixa.app.application.notification.dto.NotificationUnreadCountResponse;
import com.aerixa.app.application.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Gestion des notifications utilisateur")
@SecurityRequirement(name = "bearerAuth")
public class NotificationsController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Lister mes notifications", description = "Retourne les notifications paginees de l'utilisateur connecte")
    public ResponseEntity<PagedResponse<NotificationResponse>> listNotifications(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "ALL") String readStatus) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(notificationService.listUserNotifications(userId, page, size, readStatus));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Compter les notifications non lues")
    public ResponseEntity<NotificationUnreadCountResponse> unreadCount(Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(notificationService.getUnreadCount(userId));
    }

    @PatchMapping("/{id}/read-status")
    @Operation(summary = "Marquer une notification lue ou non lue")
    public ResponseEntity<NotificationResponse> updateReadStatus(
            Authentication authentication,
            @PathVariable UUID id,
            @RequestBody NotificationReadStatusRequest request) {
        UUID userId = UUID.fromString(authentication.getName());
        if (request == null || request.getRead() == null) {
            throw new IllegalArgumentException("Le statut de lecture est obligatoire");
        }
        return ResponseEntity.ok(notificationService.updateReadStatus(userId, id, request.getRead()));
    }

    @PatchMapping("/read-status")
    @Operation(summary = "Bulk marquer lu ou non lu")
    public ResponseEntity<NotificationBulkActionResponse> updateBulkReadStatus(
            Authentication authentication,
            @RequestBody NotificationBulkReadStatusRequest request) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(notificationService.updateBulkReadStatus(userId, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer une notification")
    public ResponseEntity<Void> deleteNotification(Authentication authentication, @PathVariable UUID id) {
        UUID userId = UUID.fromString(authentication.getName());
        notificationService.deleteNotification(userId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-delete")
    @Operation(summary = "Supprimer plusieurs notifications")
    public ResponseEntity<NotificationBulkActionResponse> deleteBulkNotifications(
            Authentication authentication,
            @RequestBody NotificationBulkDeleteRequest request) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(notificationService.deleteBulkNotifications(userId, request));
    }
}
