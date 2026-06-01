package com.aerixa.app.application.mail.service;

import com.aerixa.app.application.mail.dto.MailTypeRequest;
import com.aerixa.app.application.mail.dto.MailTypeResponse;
import com.aerixa.app.application.mail.dto.MailTypeCategoryOptionResponse;
import com.aerixa.app.domain.mail.entity.MailType;
import com.aerixa.app.domain.mail.model.MailTypeCategory;
import com.aerixa.app.domain.mail.repository.MailTypeRepository;
import com.aerixa.app.domain.mail.repository.MailTemplateRepository;
import com.aerixa.app.infrastructure.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class MailTypeService {

    private final MailTypeRepository mailTypeRepository;
    private final MailTemplateRepository mailTemplateRepository;

        public List<MailTypeCategoryOptionResponse> getAvailableCategories() {
        return Arrays.stream(MailTypeCategory.values())
            .map(category -> MailTypeCategoryOptionResponse.builder()
                .value(category.name())
                .module(category.getModule())
                .action(category.getAction())
                .defaultCode(category.getDefaultCode())
                .label(category.getLabel())
                .description(category.getDescription())
                .build())
            .collect(Collectors.toList());
        }

    /**
     * Liste tous les types de mail
     */
    public List<MailTypeResponse> getAllMailTypes() {
        return mailTypeRepository.findAll(Sort.by(Sort.Direction.ASC, "name"))
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Liste uniquement les types de mail actifs
     */
    public List<MailTypeResponse> getActiveMailTypes() {
        return mailTypeRepository.findAllActive()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Récupère un type de mail par son ID
     */
    public MailTypeResponse getMailTypeById(UUID id) {
        MailType mailType = mailTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MailType not found with id: " + id));
        return toResponse(mailType);
    }

    /**
     * Récupère un type de mail par son code
     */
    public MailTypeResponse getMailTypeByCode(String code) {
        MailType mailType = mailTypeRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("MailType not found with code: " + code));
        return toResponse(mailType);
    }

    /**
     * Crée un nouveau type de mail
     */
    public MailTypeResponse createMailType(MailTypeRequest request) {
        MailTypeCategory category = MailTypeCategory.fromValue(request.getCategory());
        String resolvedCode = resolveCode(request.getCode(), category);

        if (mailTypeRepository.existsByCode(resolvedCode)) {
            throw new IllegalArgumentException("MailType with code already exists: " + resolvedCode);
        }

        if (mailTypeRepository.existsByCategory(category.name())) {
            throw new IllegalArgumentException("MailType category already exists: " + category.name());
        }

        MailType mailType = MailType.builder()
                .code(resolvedCode)
                .category(category.name())
                .name(request.getName())
                .description(request.getDescription())
                .defaultRecipient(request.getDefaultRecipient())
                .active(request.getActive())
                .minResendIntervalSeconds(request.getMinResendIntervalSeconds())
                .maxRetries(request.getMaxRetries())
                .showSystemComments(request.getShowSystemComments())
                .build();

        mailType = mailTypeRepository.save(mailType);
        return toResponse(mailType);
    }

    /**
     * Modifie un type de mail existant
     */
    public MailTypeResponse updateMailType(UUID id, MailTypeRequest request) {
        MailType mailType = mailTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MailType not found with id: " + id));

        MailTypeCategory category = MailTypeCategory.fromValue(request.getCategory());
        String resolvedCode = resolveCode(request.getCode(), category);

        if (!mailType.getCode().equals(resolvedCode) && mailTypeRepository.existsByCode(resolvedCode)) {
            throw new IllegalArgumentException("MailType with code already exists: " + resolvedCode);
        }

        if (!mailType.getCategory().equals(category.name()) && mailTypeRepository.existsByCategory(category.name())) {
            throw new IllegalArgumentException("MailType category already exists: " + category.name());
        }

        mailType.setCode(resolvedCode);
        mailType.setCategory(category.name());
        mailType.setName(request.getName());
        mailType.setDescription(request.getDescription());
        mailType.setDefaultRecipient(request.getDefaultRecipient());
        mailType.setActive(request.getActive());
        mailType.setMinResendIntervalSeconds(request.getMinResendIntervalSeconds());
        mailType.setMaxRetries(request.getMaxRetries());
        mailType.setShowSystemComments(request.getShowSystemComments());

        mailType = mailTypeRepository.save(mailType);
        return toResponse(mailType);
    }

    /**
     * Supprime un type de mail (et tous ses templates associés)
     */
    public void deleteMailType(UUID id) {
        MailType mailType = mailTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MailType not found with id: " + id));

        // Supprimer tous les templates associés
        mailTemplateRepository.findAllByMailType(mailType)
                .forEach(mailTemplateRepository::delete);

        mailTypeRepository.delete(mailType);
    }

    /**
     * Bascule l'état actif/inactif d'un type de mail
     */
    public MailTypeResponse toggleMailTypeActive(UUID id) {
        MailType mailType = mailTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MailType not found with id: " + id));

        mailType.setActive(!mailType.getActive());
        mailType = mailTypeRepository.save(mailType);
        return toResponse(mailType);
    }

    /**
     * Convertit une entité MailType en DTO MailTypeResponse
     */
    private MailTypeResponse toResponse(MailType mailType) {
        return MailTypeResponse.builder()
                .id(mailType.getId())
                .code(mailType.getCode())
                .category(mailType.getCategory())
                .name(mailType.getName())
                .description(mailType.getDescription())
                .defaultRecipient(mailType.getDefaultRecipient())
                .active(mailType.getActive())
                .minResendIntervalSeconds(mailType.getMinResendIntervalSeconds())
                .maxRetries(mailType.getMaxRetries())
                .showSystemComments(mailType.getShowSystemComments())
                .createdAt(mailType.getCreatedAt())
                .updatedAt(mailType.getUpdatedAt())
                .build();
    }

    private String resolveCode(String requestedCode, MailTypeCategory category) {
        if (requestedCode == null || requestedCode.isBlank()) {
            return category.getDefaultCode();
        }
        return requestedCode.trim().toUpperCase();
    }
}
