package com.aerixa.app.application.candidates.service;

import com.aerixa.app.application.candidates.dto.CandidateNoteAttachmentResponse;
import com.aerixa.app.application.candidates.security.CandidatesPermissions;
import com.aerixa.app.application.candidates.storage.AttachmentStorage;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditAction;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEntityType;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEvent;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditOutcome;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.EstablishmentAccessGuard;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.candidates.entity.CandidateNote;
import com.aerixa.app.domain.candidates.entity.CandidateNoteAttachment;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.infrastructure.candidates.repository.CandidateNoteAttachmentJpaRepository;
import com.aerixa.app.infrastructure.candidates.repository.CandidateNoteJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
import com.aerixa.app.infrastructure.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CandidateNoteAttachmentService {

    private static final long MAX_FILE_SIZE_BYTES = 25L * 1024 * 1024;

    private final CandidateNoteAttachmentJpaRepository attachmentJpaRepository;
    private final CandidateNoteJpaRepository candidateNoteJpaRepository;
    private final EstablishmentJpaRepository establishmentJpaRepository;
    private final UserRepository userRepository;
    private final ConfigurationPermissionGuard permissionGuard;
    private final ConfigurationAuditPublisher auditPublisher;
    private final AttachmentStorage attachmentStorage;
    private final EstablishmentAccessGuard establishmentAccessGuard;

    @Transactional
    public CandidateNoteAttachmentResponse upload(UUID actorUserId, UUID establishmentId, UUID noteId, MultipartFile file,
                                                   String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATE_ATTACHMENTS_CREATE);
        assertEstablishmentAccess(actor, establishmentId);

        try {
            CandidateNote note = candidateNoteJpaRepository.findByIdAndEstablishmentId(noteId, establishmentId)
                    .filter(n -> !n.isDeleted())
                    .orElseThrow(() -> new ResourceNotFoundException("Note introuvable"));

            if (file == null || file.isEmpty()) {
                throw new IllegalArgumentException("Le fichier est obligatoire");
            }
            if (file.getSize() > MAX_FILE_SIZE_BYTES) {
                throw new IllegalArgumentException("Le fichier ne doit pas depasser 25 Mo");
            }
            String contentType = file.getContentType();
            if (contentType == null || contentType.isBlank()) {
                contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
            }
            String filename = file.getOriginalFilename();
            if (filename == null || filename.isBlank()) {
                filename = "fichier";
            }

            CandidateNoteAttachment attachment = CandidateNoteAttachment.builder()
                    .establishmentId(establishmentId)
                    .candidateNoteId(note.getId())
                    .contentType(contentType)
                    .filename(filename)
                    .fileSize(file.getSize())
                    .uploadedByUserId(actor.getId())
                    .uploadedByLabel(actor.getEmail())
                    .build();

            byte[] content;
            try {
                content = file.getBytes();
            } catch (IOException ex) {
                throw new IllegalArgumentException("Impossible de lire le fichier", ex);
            }
            attachmentStorage.store(attachment, content);

            CandidateNoteAttachment saved = attachmentJpaRepository.save(attachment);

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.CREATE, saved.getId(), correlationId,
                    Map.of("candidateNoteId", note.getId().toString(), "filename", filename, "fileSize", file.getSize()));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.CREATE, noteId, correlationId,
                    "CANDIDATE_ATTACHMENT_CREATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public AttachmentContent download(UUID actorUserId, UUID establishmentId, UUID attachmentId, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATE_ATTACHMENTS_READ);
        assertEstablishmentAccess(actor, establishmentId);

        CandidateNoteAttachment attachment = attachmentJpaRepository.findByIdAndEstablishmentId(attachmentId, establishmentId)
                .filter(a -> !a.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Piece jointe introuvable"));

        boolean isUploader = attachment.getUploadedByUserId() != null && attachment.getUploadedByUserId().equals(actor.getId());
        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.READ, attachment.getId(), correlationId,
                Map.of("downloadedByUploader", isUploader, "filename", attachment.getFilename()));

        return new AttachmentContent(attachmentStorage.retrieve(attachment), attachment.getContentType(), attachment.getFilename());
    }

    @Transactional
    public void delete(UUID actorUserId, UUID establishmentId, UUID attachmentId, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATE_ATTACHMENTS_DELETE);
        assertEstablishmentAccess(actor, establishmentId);

        try {
            CandidateNoteAttachment attachment = attachmentJpaRepository.findByIdAndEstablishmentId(attachmentId, establishmentId)
                    .filter(a -> !a.isDeleted())
                    .orElseThrow(() -> new ResourceNotFoundException("Piece jointe introuvable"));

            boolean isUploader = attachment.getUploadedByUserId() != null && attachment.getUploadedByUserId().equals(actor.getId());
            boolean isElevated = actor.hasRole("SUPER_ADMIN") || actor.hasRole("ADMIN");
            if (!isUploader && !isElevated) {
                throw new PermissionDeniedException(CandidatesPermissions.CANDIDATE_ATTACHMENTS_DELETE);
            }

            attachmentStorage.delete(attachment);
            attachment.setDeletedAt(LocalDateTime.now());
            attachment.setDeletedByUserId(actor.getId());
            attachment.setDeletedByLabel(actor.getEmail());
            attachmentJpaRepository.save(attachment);

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE, attachment.getId(), correlationId,
                    Map.of("deletedByUploader", isUploader, "filename", attachment.getFilename()));
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE, attachmentId, correlationId,
                    "CANDIDATE_ATTACHMENT_DELETE_FAILED", ex);
            throw ex;
        }
    }

    private void assertEstablishmentAccess(User actor, UUID establishmentId) {
        establishmentAccessGuard.assertAccess(actor, establishmentId);
    }

    private User actor(UUID actorUserId) {
        return userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
    }

    private CandidateNoteAttachmentResponse toResponse(CandidateNoteAttachment attachment) {
        return CandidateNoteAttachmentResponse.builder()
                .id(attachment.getId())
                .candidateNoteId(attachment.getCandidateNoteId())
                .contentType(attachment.getContentType())
                .filename(attachment.getFilename())
                .fileSize(attachment.getFileSize())
                .uploadedByUserId(attachment.getUploadedByUserId())
                .uploadedByLabel(attachment.getUploadedByLabel())
                .createdAt(attachment.getCreatedAt())
                .build();
    }

    private void publishSuccess(UUID actorId, UUID establishmentId, ConfigurationAuditAction action, UUID entityId,
                                 String correlationId, Map<String, Object> payloadDiff) {
        auditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.CANDIDATE_NOTE_ATTACHMENT)
                .entityId(entityId)
                .correlationId(normalizeCorrelationId(correlationId))
                .outcome(ConfigurationAuditOutcome.SUCCESS)
                .payloadDiff(payloadDiff)
                .build());
    }

    private void publishFailure(UUID actorId, UUID establishmentId, ConfigurationAuditAction action, UUID entityId,
                                 String correlationId, String reasonCode, RuntimeException ex) {
        auditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId == null ? UUID.fromString("00000000-0000-0000-0000-000000000000") : establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.CANDIDATE_NOTE_ATTACHMENT)
                .entityId(entityId)
                .correlationId(normalizeCorrelationId(correlationId))
                .outcome(ConfigurationAuditOutcome.FAILURE)
                .reasonCode(reasonCode)
                .errorMessage(ex.getMessage())
                .payloadDiff(Map.of())
                .build());
    }

    private String normalizeCorrelationId(String correlationId) {
        return correlationId == null || correlationId.isBlank() ? UUID.randomUUID().toString() : correlationId.trim();
    }

    @Value
    public static class AttachmentContent {
        byte[] content;
        String contentType;
        String filename;
    }
}
