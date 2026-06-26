package com.aerixa.app.infrastructure.candidates.controller;

import com.aerixa.app.application.candidates.dto.CandidateNoteAttachmentResponse;
import com.aerixa.app.application.candidates.service.CandidateNoteAttachmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "CandidateNoteAttachments", description = "Pieces jointes des notes de candidature")
@SecurityRequirement(name = "bearerAuth")
public class CandidateNoteAttachmentsController {

    private final CandidateNoteAttachmentService candidateNoteAttachmentService;

    @PostMapping("/api/v1/candidates/{candidateId}/notes/{noteId}/attachments")
    @PreAuthorize("hasAuthority('candidate_attachments:create')")
    @Operation(summary = "Joindre un fichier a une note de candidature")
    public ResponseEntity<CandidateNoteAttachmentResponse> upload(@PathVariable UUID candidateId,
                                                                   @PathVariable UUID noteId,
                                                                   @RequestParam UUID establishmentId,
                                                                   @RequestParam("file") MultipartFile file,
                                                                   Authentication authentication,
                                                                   HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(candidateNoteAttachmentService.upload(currentUserId(authentication), establishmentId, noteId, file,
                        resolveCorrelationId(httpRequest)));
    }

    @GetMapping("/api/v1/candidates/{candidateId}/notes/{noteId}/attachments/{attachmentId}")
    @PreAuthorize("hasAuthority('candidate_attachments:read')")
    @Operation(summary = "Consulter/telecharger une piece jointe de note de candidature")
    public ResponseEntity<byte[]> download(@PathVariable UUID candidateId,
                                            @PathVariable UUID noteId,
                                            @PathVariable UUID attachmentId,
                                            @RequestParam UUID establishmentId,
                                            Authentication authentication,
                                            HttpServletRequest httpRequest) {
        CandidateNoteAttachmentService.AttachmentContent content = candidateNoteAttachmentService.download(
                currentUserId(authentication), establishmentId, attachmentId, resolveCorrelationId(httpRequest));

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(content.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(content.getFilename()).build().toString())
                .body(content.getContent());
    }

    @DeleteMapping("/api/v1/candidates/{candidateId}/notes/{noteId}/attachments/{attachmentId}")
    @PreAuthorize("hasAuthority('candidate_attachments:delete')")
    @Operation(summary = "Supprimer une piece jointe de note de candidature")
    public ResponseEntity<Void> delete(@PathVariable UUID candidateId,
                                        @PathVariable UUID noteId,
                                        @PathVariable UUID attachmentId,
                                        @RequestParam UUID establishmentId,
                                        Authentication authentication,
                                        HttpServletRequest httpRequest) {
        candidateNoteAttachmentService.delete(currentUserId(authentication), establishmentId, attachmentId,
                resolveCorrelationId(httpRequest));
        return ResponseEntity.noContent().build();
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
