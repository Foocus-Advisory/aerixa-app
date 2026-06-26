package com.aerixa.app.application.configuration.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditAction;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEntityType;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEvent;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditOutcome;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.dto.CreateEstablishmentRequest;
import com.aerixa.app.application.configuration.dto.EstablishmentResponse;
import com.aerixa.app.application.configuration.dto.UpdateEstablishmentRequest;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.ConfigurationPermissions;
import com.aerixa.app.application.configuration.security.EstablishmentAccessGuard;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.infrastructure.auth.repository.OperatorEstablishmentAssignmentJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
import com.aerixa.app.infrastructure.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EstablishmentService {

    private static final UUID GLOBAL_SCOPE_ESTABLISHMENT_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");

    private final EstablishmentJpaRepository establishmentJpaRepository;
    private final UserRepository userRepository;
    private final ConfigurationPermissionGuard configurationPermissionGuard;
    private final ConfigurationAuditPublisher configurationAuditPublisher;
    private final EstablishmentAccessGuard establishmentAccessGuard;
    private final OperatorEstablishmentAssignmentJpaRepository operatorEstablishmentAssignmentJpaRepository;

    @Transactional(readOnly = true)
    public List<EstablishmentResponse> listEstablishments(UUID actorUserId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ESTABLISHMENTS_LIST);

        Sort sort = Sort.by(Sort.Direction.ASC, "name");
        List<Establishment> establishments;
        if (actor.hasRole("SUPER_ADMIN")) {
            establishments = establishmentJpaRepository.findAll(sort);
        } else if (actor.hasRole("OPERATOR")) {
            List<UUID> assignedIds = operatorEstablishmentAssignmentJpaRepository.findEstablishmentIdsByOperatorUserId(actor.getId());
            establishments = assignedIds.isEmpty() ? List.of() : establishmentJpaRepository.findAllById(assignedIds);
        } else {
            establishments = establishmentJpaRepository.findAllByCreatedByUserId(actor.getId(), sort);
        }

        publishSuccess(actor.getId(), GLOBAL_SCOPE_ESTABLISHMENT_ID, ConfigurationAuditAction.LIST,
                null, correlationId, Map.of("count", establishments.size()));

        return establishments.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public EstablishmentResponse getEstablishment(UUID actorUserId, UUID establishmentId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ESTABLISHMENTS_READ);

        Establishment establishment = establishmentAccessGuard.assertAccess(actor, establishmentId);
        publishSuccess(actor.getId(), establishment.getId(), ConfigurationAuditAction.READ,
                establishment.getId(), correlationId, Map.of());

        return toResponse(establishment);
    }

    @Transactional
    public EstablishmentResponse createEstablishment(UUID actorUserId, CreateEstablishmentRequest request, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ESTABLISHMENTS_CREATE);

        try {
            if (request == null || isBlank(request.getCode()) || isBlank(request.getName())) {
                throw new IllegalArgumentException("Le code et le nom de l'etablissement sont obligatoires");
            }

            if (establishmentJpaRepository.existsByCode(request.getCode().trim())) {
                throw new IllegalArgumentException("Un etablissement avec ce code existe deja");
            }

            boolean isSuperAdmin = actor.hasRole("SUPER_ADMIN");
            boolean isAdmin = actor.hasRole("ADMIN");
            if (isAdmin && !isSuperAdmin && establishmentJpaRepository.existsByCreatedByUserId(actor.getId())) {
                throw new PermissionDeniedException("establishments:create");
            }

            Establishment establishment = Establishment.builder()
                    .code(request.getCode().trim())
                    .name(request.getName().trim())
                    .shortName(isBlank(request.getShortName()) ? null : request.getShortName().trim())
                    .addressLine1(isBlank(request.getAddressLine1()) ? null : request.getAddressLine1().trim())
                    .addressLine2(isBlank(request.getAddressLine2()) ? null : request.getAddressLine2().trim())
                    .city(isBlank(request.getCity()) ? null : request.getCity().trim())
                    .country(isBlank(request.getCountry()) ? null : request.getCountry().trim())
                    .whatsappPhonePrefix(isBlank(request.getWhatsappPhonePrefix()) ? null : request.getWhatsappPhonePrefix().trim())
                    .whatsappPhone(isBlank(request.getWhatsappPhone()) ? null : request.getWhatsappPhone().trim())
                    .otherPhonePrefix(isBlank(request.getOtherPhonePrefix()) ? null : request.getOtherPhonePrefix().trim())
                    .otherPhone(isBlank(request.getOtherPhone()) ? null : request.getOtherPhone().trim())
                    .email(isBlank(request.getEmail()) ? null : request.getEmail().trim())
                    .logoUrl(isBlank(request.getLogoUrl()) ? null : request.getLogoUrl().trim())
                    .status(Establishment.EstablishmentStatus.ACTIVE)
                    .createdByUserId(actor.getId())
                    .createdByLabel(actor.getEmail())
                    .build();

            Establishment saved = establishmentJpaRepository.save(establishment);
            publishSuccess(actor.getId(), saved.getId(), ConfigurationAuditAction.CREATE,
                    saved.getId(), correlationId, Map.of("after", Map.of("code", saved.getCode(), "name", saved.getName())));

            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), GLOBAL_SCOPE_ESTABLISHMENT_ID, ConfigurationAuditAction.CREATE,
                    null, correlationId, "ESTABLISHMENT_CREATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public EstablishmentResponse updateEstablishment(UUID actorUserId, UUID establishmentId, UpdateEstablishmentRequest request, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ESTABLISHMENTS_UPDATE);

        Establishment establishment = resolveScopedEstablishment(actor, establishmentId);

        try {
            String beforeName = establishment.getName();
            String beforeShortName = establishment.getShortName();
            String beforeStatus = establishment.getStatus().name();

            if (request == null) {
                throw new IllegalArgumentException("La requete de mise a jour est obligatoire");
            }

            if (request.getName() != null) {
                if (isBlank(request.getName())) {
                    throw new IllegalArgumentException("Le nom de l'etablissement ne peut pas etre vide");
                }
                establishment.setName(request.getName().trim());
            }

            if (request.getShortName() != null) {
                establishment.setShortName(isBlank(request.getShortName()) ? null : request.getShortName().trim());
            }

            if (request.getStatus() != null) {
                establishment.setStatus(Establishment.EstablishmentStatus.valueOf(request.getStatus().trim().toUpperCase()));
            }

            if (request.getAddressLine1() != null) {
                establishment.setAddressLine1(isBlank(request.getAddressLine1()) ? null : request.getAddressLine1().trim());
            }

            if (request.getAddressLine2() != null) {
                establishment.setAddressLine2(isBlank(request.getAddressLine2()) ? null : request.getAddressLine2().trim());
            }

            if (request.getCity() != null) {
                establishment.setCity(isBlank(request.getCity()) ? null : request.getCity().trim());
            }

            if (request.getCountry() != null) {
                establishment.setCountry(isBlank(request.getCountry()) ? null : request.getCountry().trim());
            }

            if (request.getWhatsappPhonePrefix() != null) {
                establishment.setWhatsappPhonePrefix(isBlank(request.getWhatsappPhonePrefix()) ? null : request.getWhatsappPhonePrefix().trim());
            }

            if (request.getWhatsappPhone() != null) {
                establishment.setWhatsappPhone(isBlank(request.getWhatsappPhone()) ? null : request.getWhatsappPhone().trim());
            }

            if (request.getOtherPhonePrefix() != null) {
                establishment.setOtherPhonePrefix(isBlank(request.getOtherPhonePrefix()) ? null : request.getOtherPhonePrefix().trim());
            }

            if (request.getOtherPhone() != null) {
                establishment.setOtherPhone(isBlank(request.getOtherPhone()) ? null : request.getOtherPhone().trim());
            }

            if (request.getEmail() != null) {
                establishment.setEmail(isBlank(request.getEmail()) ? null : request.getEmail().trim());
            }

            if (request.getLogoUrl() != null) {
                establishment.setLogoUrl(isBlank(request.getLogoUrl()) ? null : request.getLogoUrl().trim());
            }
            establishment.setUpdatedByUserId(actor.getId());
            establishment.setUpdatedByLabel(actor.getEmail());

            Establishment saved = establishmentJpaRepository.save(establishment);
            publishSuccess(actor.getId(), saved.getId(), ConfigurationAuditAction.UPDATE,
                    saved.getId(), correlationId,
                    Map.of(
                            "before", Map.of("name", beforeName, "shortName", beforeShortName, "status", beforeStatus),
                            "after", Map.of("name", saved.getName(), "shortName", saved.getShortName(), "status", saved.getStatus().name())
                    ));

            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishment.getId(), ConfigurationAuditAction.UPDATE,
                    establishment.getId(), correlationId, "ESTABLISHMENT_UPDATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public EstablishmentResponse activateEstablishment(UUID actorUserId, UUID establishmentId, String correlationId) {
        return changeStatus(actorUserId, establishmentId, Establishment.EstablishmentStatus.ACTIVE,
                ConfigurationPermissions.ESTABLISHMENTS_ACTIVATE, ConfigurationAuditAction.ACTIVATE, correlationId);
    }

    @Transactional
    public EstablishmentResponse deactivateEstablishment(UUID actorUserId, UUID establishmentId, String correlationId) {
        return changeStatus(actorUserId, establishmentId, Establishment.EstablishmentStatus.INACTIVE,
                ConfigurationPermissions.ESTABLISHMENTS_DEACTIVATE, ConfigurationAuditAction.DEACTIVATE, correlationId);
    }

    @Transactional
    public EstablishmentResponse deleteEstablishment(UUID actorUserId, UUID establishmentId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ESTABLISHMENTS_DELETE);
        Establishment establishment = resolveScopedEstablishment(actor, establishmentId);

        try {
            establishmentJpaRepository.delete(establishment);
            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE, establishmentId, correlationId,
                    Map.of("deleted", Map.of("code", establishment.getCode(), "name", establishment.getName())));
            return toResponse(establishment);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE, establishmentId, correlationId,
                    "ESTABLISHMENT_DELETE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public EstablishmentResponse updateEstablishmentLogo(UUID actorUserId, UUID establishmentId, MultipartFile file, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ESTABLISHMENTS_UPDATE);

        Establishment establishment = resolveScopedEstablishment(actor, establishmentId);

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier logo est obligatoire");
        }

        String contentType = file.getContentType();
        if (contentType == null || contentType.isBlank() || !contentType.toLowerCase().startsWith("image/")) {
            throw new IllegalArgumentException("Le logo doit etre une image valide");
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("Le logo ne doit pas depasser 5 Mo");
        }

        try {
            establishment.setLogoFile(file.getBytes());
        } catch (IOException ex) {
            throw new IllegalArgumentException("Impossible de lire le fichier logo", ex);
        }

        establishment.setLogoContentType(contentType);
        establishment.setLogoFilename(file.getOriginalFilename());
        establishment.setLogoUrl(null);

        Establishment saved = establishmentJpaRepository.save(establishment);
        publishSuccess(actor.getId(), saved.getId(), ConfigurationAuditAction.UPDATE,
                saved.getId(), correlationId, Map.of("after", Map.of("logo", "uploaded")));
        return toResponse(saved);
    }

    @Transactional
    public EstablishmentResponse deleteEstablishmentLogo(UUID actorUserId, UUID establishmentId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ESTABLISHMENTS_UPDATE);

        Establishment establishment = resolveScopedEstablishment(actor, establishmentId);
        establishment.setLogoFile(null);
        establishment.setLogoContentType(null);
        establishment.setLogoFilename(null);
        establishment.setLogoUrl(null);

        Establishment saved = establishmentJpaRepository.save(establishment);
        publishSuccess(actor.getId(), saved.getId(), ConfigurationAuditAction.UPDATE,
                saved.getId(), correlationId, Map.of("after", Map.of("logo", "deleted")));
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public LogoContent getEstablishmentLogo(UUID actorUserId, UUID establishmentId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ESTABLISHMENTS_READ);

        Establishment establishment = establishmentAccessGuard.assertAccess(actor, establishmentId);
        if (!establishment.hasLogo()) {
            throw new ResourceNotFoundException("Logo etablissement introuvable");
        }

        publishSuccess(actor.getId(), establishment.getId(), ConfigurationAuditAction.READ,
                establishment.getId(), correlationId, Map.of("logo", "read"));

        String contentType = establishment.getLogoContentType();
        if (contentType == null || contentType.isBlank()) {
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        return new LogoContent(establishment.getLogoFile(), contentType, establishment.getLogoFilename());
    }

    private EstablishmentResponse changeStatus(UUID actorUserId,
                                               UUID establishmentId,
                                               Establishment.EstablishmentStatus targetStatus,
                                               String permission,
                                               ConfigurationAuditAction action,
                                               String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, permission);
        Establishment establishment = resolveScopedEstablishment(actor, establishmentId);

        try {
            Establishment.EstablishmentStatus beforeStatus = establishment.getStatus();
            establishment.setStatus(targetStatus);
            Establishment saved = establishmentJpaRepository.save(establishment);

            publishSuccess(actor.getId(), saved.getId(), action, saved.getId(), correlationId,
                    Map.of(
                            "before", Map.of("status", beforeStatus.name()),
                            "after", Map.of("status", saved.getStatus().name())
                    ));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishment.getId(), action, establishment.getId(), correlationId,
                    action == ConfigurationAuditAction.ACTIVATE ? "ESTABLISHMENT_ACTIVATE_FAILED" : "ESTABLISHMENT_DEACTIVATE_FAILED",
                    ex);
            throw ex;
        }
    }

    private Establishment resolveScopedEstablishment(User actor, UUID establishmentId) {
        Establishment establishment = establishmentJpaRepository.findById(establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Etablissement introuvable"));

        if (actor.hasRole("SUPER_ADMIN")) {
            return establishment;
        }

        if (!actor.getId().equals(establishment.getCreatedByUserId())) {
            throw new PermissionDeniedException("establishments:scope");
        }

        return establishment;
    }

    private User actor(UUID actorUserId) {
        return userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
    }

    private void publishSuccess(UUID actorId,
                                UUID establishmentId,
                                ConfigurationAuditAction action,
                                UUID entityId,
                                String correlationId,
                                Map<String, Object> payloadDiff) {
        configurationAuditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.ESTABLISHMENT)
                .entityId(entityId)
                .correlationId(normalizeCorrelationId(correlationId))
                .outcome(ConfigurationAuditOutcome.SUCCESS)
                .payloadDiff(payloadDiff)
                .build());
    }

    private void publishFailure(UUID actorId,
                                UUID establishmentId,
                                ConfigurationAuditAction action,
                                UUID entityId,
                                String correlationId,
                                String reasonCode,
                                RuntimeException exception) {
        configurationAuditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.ESTABLISHMENT)
                .entityId(entityId)
                .correlationId(normalizeCorrelationId(correlationId))
                .outcome(ConfigurationAuditOutcome.FAILURE)
                .reasonCode(reasonCode)
                .errorMessage(exception.getMessage())
                .payloadDiff(Map.of())
                .build());
    }

    private String normalizeCorrelationId(String correlationId) {
        return isBlank(correlationId) ? UUID.randomUUID().toString() : correlationId.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private EstablishmentResponse toResponse(Establishment establishment) {
        return EstablishmentResponse.builder()
                .id(establishment.getId())
                .code(establishment.getCode())
                .name(establishment.getName())
                .shortName(establishment.getShortName())
                .status(establishment.getStatus().name())
                .addressLine1(establishment.getAddressLine1())
                .addressLine2(establishment.getAddressLine2())
                .city(establishment.getCity())
                .country(establishment.getCountry())
                .whatsappPhonePrefix(establishment.getWhatsappPhonePrefix())
                .whatsappPhone(establishment.getWhatsappPhone())
                .otherPhonePrefix(establishment.getOtherPhonePrefix())
                .otherPhone(establishment.getOtherPhone())
                .email(establishment.getEmail())
                .logoUrl(establishment.hasLogo() ? "/api/v1/establishments/" + establishment.getId() + "/logo" : establishment.getLogoUrl())
                .createdByUserId(establishment.getCreatedByUserId())
                .createdByLabel(establishment.getCreatedByLabel())
                .updatedByUserId(establishment.getUpdatedByUserId())
                .updatedByLabel(establishment.getUpdatedByLabel())
                .createdAt(establishment.getCreatedAt())
                .updatedAt(establishment.getUpdatedAt())
                .build();
    }

    public record LogoContent(byte[] content, String contentType, String fileName) {
    }
}
