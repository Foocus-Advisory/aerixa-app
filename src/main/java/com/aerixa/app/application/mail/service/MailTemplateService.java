package com.aerixa.app.application.mail.service;

import com.aerixa.app.application.mail.dto.MailTemplateRequest;
import com.aerixa.app.application.mail.dto.MailTemplateResponse;
import com.aerixa.app.domain.mail.entity.MailTemplate;
import com.aerixa.app.domain.mail.entity.MailType;
import com.aerixa.app.domain.mail.repository.MailTemplateRepository;
import com.aerixa.app.domain.mail.repository.MailTypeRepository;
import com.aerixa.app.infrastructure.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class MailTemplateService {

    private final MailTemplateRepository mailTemplateRepository;
    private final MailTypeRepository mailTypeRepository;

    /**
     * Récupère le template actuel pour un type de mail et une langue donnés
     */
    public MailTemplateResponse getActiveTemplate(UUID mailTypeId, String language) {
        MailType mailType = mailTypeRepository.findById(mailTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("MailType not found with id: " + mailTypeId));

        MailTemplate template = mailTemplateRepository.findCurrentByMailTypeAndLanguage(mailType, language)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No active template found for mailTypeId: " + mailTypeId + ", language: " + language));

        return toResponse(template);
    }

    /**
     * Liste tous les templates d'un type de mail
     */
    public List<MailTemplateResponse> getTemplatesByMailType(UUID mailTypeId) {
        MailType mailType = mailTypeRepository.findById(mailTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("MailType not found with id: " + mailTypeId));

        return mailTemplateRepository.findAllByMailType(mailType)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Liste toutes les versions d'un template
     */
    public List<MailTemplateResponse> getTemplateVersions(UUID mailTypeId) {
        mailTypeRepository.findById(mailTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("MailType not found with id: " + mailTypeId));

        return mailTemplateRepository.findAllVersionsByMailTypeId(mailTypeId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Récupère un template par son ID
     */
    public MailTemplateResponse getTemplateById(UUID id) {
        MailTemplate template = mailTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MailTemplate not found with id: " + id));
        return toResponse(template);
    }

    /**
     * Crée un nouveau template ou une nouvelle version d'un template existant
     */
    public MailTemplateResponse createOrUpdateTemplate(MailTemplateRequest request, String currentUserId) {
        MailType mailType = mailTypeRepository.findById(request.getMailTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("MailType not found with id: " + request.getMailTypeId()));

        MailTemplate template;

        if (request.getCreateNewVersion()) {
            // Créer une nouvelle version
            MailTemplate currentTemplate = mailTemplateRepository.findCurrentByMailTypeId(request.getMailTypeId())
                    .orElse(null);

            if (currentTemplate == null) {
                throw new ResourceNotFoundException("No existing template to create version from");
            }

            // Marquer l'ancienne version comme non-courante
            currentTemplate.setIsCurrent(false);
            mailTemplateRepository.save(currentTemplate);

            // Créer la nouvelle version
            template = MailTemplate.builder()
                    .mailType(mailType)
                    .subject(request.getSubject())
                    .htmlContent(request.getHtmlContent())
                    .textContent(request.getTextContent())
                    .preview(request.getPreview())
                    .language(request.getLanguage() != null ? request.getLanguage() : "fr")
                    .versionNumber(currentTemplate.getVersionNumber() + 1)
                    .isCurrent(true)
                    .versionNotes(request.getVersionNotes())
                    .createdByUserId(currentUserId)
                    .lastModifiedByUserId(currentUserId)
                    .supportedVariables(request.getSupportedVariables())
                    .customStyles(request.getCustomStyles())
                    .publishedAt(Instant.now().toEpochMilli())
                    .build();
        } else {
            // Vérifier s'il existe un template pour ce type et cette langue
            template = mailTemplateRepository.findCurrentByMailTypeAndLanguage(mailType, request.getLanguage() != null ? request.getLanguage() : "fr")
                    .orElse(null);

            if (template != null) {
                // Mise à jour du template existant
                template.setSubject(request.getSubject());
                template.setHtmlContent(request.getHtmlContent());
                template.setTextContent(request.getTextContent());
                template.setPreview(request.getPreview());
                template.setLastModifiedByUserId(currentUserId);
                template.setVersionNotes(request.getVersionNotes());
                template.setSupportedVariables(request.getSupportedVariables());
                template.setCustomStyles(request.getCustomStyles());
                template.setPublishedAt(Instant.now().toEpochMilli());
            } else {
                // Créer un nouveau template
                template = MailTemplate.builder()
                        .mailType(mailType)
                        .subject(request.getSubject())
                        .htmlContent(request.getHtmlContent())
                        .textContent(request.getTextContent())
                        .preview(request.getPreview())
                        .language(request.getLanguage() != null ? request.getLanguage() : "fr")
                        .versionNumber(1)
                        .isCurrent(true)
                        .versionNotes(request.getVersionNotes())
                        .createdByUserId(currentUserId)
                        .lastModifiedByUserId(currentUserId)
                        .supportedVariables(request.getSupportedVariables())
                        .customStyles(request.getCustomStyles())
                        .publishedAt(Instant.now().toEpochMilli())
                        .build();
            }
        }

        template = mailTemplateRepository.save(template);
        return toResponse(template);
    }

    /**
     * Active une version spécifique d'un template
     */
    public MailTemplateResponse activateTemplateVersion(UUID templateId) {
        MailTemplate template = mailTemplateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("MailTemplate not found with id: " + templateId));
        UUID mailTypeId = template.getMailType().getId();
        String targetLanguage = template.getLanguage();

        // Désactiver les autres versions pour le même type/langue
        mailTemplateRepository.findAllVersionsByMailTypeId(mailTypeId)
                .forEach(t -> {
                    if (t.getLanguage().equals(targetLanguage)) {
                        t.setIsCurrent(false);
                        mailTemplateRepository.save(t);
                    }
                });

        // Activer cette version
        template.setIsCurrent(true);
        template.setPublishedAt(Instant.now().toEpochMilli());
        MailTemplate savedTemplate = mailTemplateRepository.save(template);
        return toResponse(savedTemplate);
    }

    /**
     * Bascule l'etat actif/inactif d'un template
     */
    public MailTemplateResponse toggleTemplateActive(UUID templateId) {
        MailTemplate template = mailTemplateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("MailTemplate not found with id: " + templateId));

        if (Boolean.TRUE.equals(template.getIsCurrent())) {
            template.setIsCurrent(false);
            MailTemplate savedTemplate = mailTemplateRepository.save(template);
            return toResponse(savedTemplate);
        }

        UUID mailTypeId = template.getMailType().getId();
        String targetLanguage = template.getLanguage();

        mailTemplateRepository.findAllVersionsByMailTypeId(mailTypeId)
                .forEach(t -> {
                    if (t.getLanguage().equals(targetLanguage)) {
                        t.setIsCurrent(false);
                        mailTemplateRepository.save(t);
                    }
                });

        template.setIsCurrent(true);
        template.setPublishedAt(Instant.now().toEpochMilli());
        MailTemplate savedTemplate = mailTemplateRepository.save(template);
        return toResponse(savedTemplate);
    }

    /**
     * Supprime un template
     */
    public void deleteTemplate(UUID id) {
        MailTemplate template = mailTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MailTemplate not found with id: " + id));
        mailTemplateRepository.delete(template);
    }

    /**
     * Convertit une entité MailTemplate en DTO MailTemplateResponse
     */
    private MailTemplateResponse toResponse(MailTemplate template) {
        return MailTemplateResponse.builder()
                .id(template.getId())
                .mailTypeId(template.getMailType().getId())
                .mailTypeCode(template.getMailType().getCode())
                .mailTypeName(template.getMailType().getName())
                .subject(template.getSubject())
                .htmlContent(template.getHtmlContent())
                .textContent(template.getTextContent())
                .preview(template.getPreview())
                .versionNumber(template.getVersionNumber())
                .isCurrent(template.getIsCurrent())
                .language(template.getLanguage())
                .versionNotes(template.getVersionNotes())
                .createdByUserId(template.getCreatedByUserId())
                .lastModifiedByUserId(template.getLastModifiedByUserId())
                .publishedAt(template.getPublishedAt())
                .supportedVariables(template.getSupportedVariables())
                .customStyles(template.getCustomStyles())
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .build();
    }
}
