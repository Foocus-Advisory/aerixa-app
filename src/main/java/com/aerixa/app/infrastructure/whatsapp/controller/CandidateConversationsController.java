package com.aerixa.app.infrastructure.whatsapp.controller;

import com.aerixa.app.application.whatsapp.dto.CandidateConversationMessageResponse;
import com.aerixa.app.application.whatsapp.dto.CandidateConversationResponse;
import com.aerixa.app.application.whatsapp.dto.SendCandidateConversationMessageRequest;
import com.aerixa.app.application.whatsapp.service.CandidateConversationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "CandidateConversations", description = "Conversations WhatsApp des candidats")
@SecurityRequirement(name = "bearerAuth")
public class CandidateConversationsController {

    private final CandidateConversationService candidateConversationService;

    @GetMapping("/api/v1/candidates/{candidateId}/conversations")
    @PreAuthorize("hasAuthority('candidate_conversations:list')")
    @Operation(summary = "Lister les conversations WhatsApp d'un candidat")
    public ResponseEntity<List<CandidateConversationResponse>> listForCandidate(@PathVariable UUID candidateId,
                                                                                  @RequestParam UUID establishmentId,
                                                                                  Authentication authentication,
                                                                                  HttpServletRequest httpRequest) {
        return ResponseEntity.ok(candidateConversationService.listForCandidate(
                currentUserId(authentication), establishmentId, candidateId, resolveCorrelationId(httpRequest)));
    }

    @GetMapping("/api/v1/candidate-conversations/{conversationId}/messages")
    @PreAuthorize("hasAuthority('candidate_conversations:read')")
    @Operation(summary = "Lister les messages d'une conversation WhatsApp")
    public ResponseEntity<List<CandidateConversationMessageResponse>> listMessages(@PathVariable UUID conversationId,
                                                                                     @RequestParam UUID establishmentId,
                                                                                     Authentication authentication,
                                                                                     HttpServletRequest httpRequest) {
        return ResponseEntity.ok(candidateConversationService.listMessages(
                currentUserId(authentication), establishmentId, conversationId, resolveCorrelationId(httpRequest)));
    }

    @PostMapping("/api/v1/candidate-conversations/{conversationId}/messages")
    @PreAuthorize("hasAuthority('candidate_conversations:send_message')")
    @Operation(summary = "Envoyer un message WhatsApp dans une conversation")
    public ResponseEntity<CandidateConversationMessageResponse> sendMessage(@PathVariable UUID conversationId,
                                                                              @RequestParam UUID establishmentId,
                                                                              @RequestBody SendCandidateConversationMessageRequest request,
                                                                              Authentication authentication,
                                                                              HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED).body(candidateConversationService.sendMessage(
                currentUserId(authentication), establishmentId, conversationId, request, resolveCorrelationId(httpRequest)));
    }

    private UUID currentUserId(Authentication authentication) {
        Authentication resolved = authentication != null ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (resolved == null || resolved.getName() == null) {
            throw new IllegalStateException("Utilisateur authentifie introuvable");
        }
        return UUID.fromString(resolved.getName());
    }

    private String resolveCorrelationId(HttpServletRequest request) {
        String correlationId = request.getHeader("X-Correlation-ID");
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = request.getHeader("X-Request-ID");
        }
        return (correlationId == null || correlationId.isBlank()) ? UUID.randomUUID().toString() : correlationId.trim();
    }
}
