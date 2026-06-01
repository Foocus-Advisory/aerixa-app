package com.aerixa.app.infrastructure.auth.controller;

import com.aerixa.app.application.auth.dto.SessionResponse;
import com.aerixa.app.application.auth.service.SessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth/sessions")
@RequiredArgsConstructor
@Tag(name = "Sessions", description = "Gestion des sessions utilisateur")
@SecurityRequirement(name = "bearerAuth")
public class SessionsController {

    private final SessionService sessionService;

    @GetMapping
    @Operation(summary = "Lister mes sessions")
    public ResponseEntity<List<SessionResponse>> listSessions(Authentication authentication,
                                                              @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        UUID userId = UUID.fromString(authentication.getName());
        String currentToken = extractBearerToken(authorizationHeader);
        return ResponseEntity.ok(sessionService.getUserActiveSessions(userId, currentToken));
    }

    @DeleteMapping("/{sessionId}")
    @Operation(summary = "Révoquer une session")
    public ResponseEntity<Void> revokeSession(Authentication authentication,
                                              @PathVariable UUID sessionId) {
        UUID userId = UUID.fromString(authentication.getName());
        sessionService.revokeSession(userId, sessionId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/revoke-others")
    @Operation(summary = "Révoquer toutes les autres sessions")
    public ResponseEntity<Void> revokeOthers(Authentication authentication,
                                             @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        UUID userId = UUID.fromString(authentication.getName());
        String currentToken = extractBearerToken(authorizationHeader);
        sessionService.revokeOtherSessions(userId, currentToken);
        return ResponseEntity.noContent().build();
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }
        return authorizationHeader.substring(7);
    }
}
