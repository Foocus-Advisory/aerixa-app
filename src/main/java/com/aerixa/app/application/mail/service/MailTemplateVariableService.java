package com.aerixa.app.application.mail.service;

import com.aerixa.app.application.mail.dto.MailTemplateVariableResponse;
import com.aerixa.app.domain.mail.entity.MailTemplateVariable;
import com.aerixa.app.domain.mail.repository.MailTemplateVariableRepository;
import com.aerixa.app.infrastructure.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class MailTemplateVariableService {

    private final MailTemplateVariableRepository mailTemplateVariableRepository;

    /**
     * Liste toutes les variables disponibles
     */
    public List<MailTemplateVariableResponse> getAllVariables() {
        return mailTemplateVariableRepository.findAllActive()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Liste les variables par catégorie
     */
    public Map<String, List<MailTemplateVariableResponse>> getVariablesByCategory() {
        List<String> categories = mailTemplateVariableRepository.findAllCategories();
        return categories.stream()
                .collect(Collectors.toMap(
                        cat -> cat,
                        cat -> mailTemplateVariableRepository.findByCategory(cat)
                                .stream()
                                .map(this::toResponse)
                                .collect(Collectors.toList())
                ));
    }

    /**
     * Récupère une variable par son ID
     */
    public MailTemplateVariableResponse getVariableById(UUID id) {
        MailTemplateVariable variable = mailTemplateVariableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Variable not found with id: " + id));
        return toResponse(variable);
    }

    /**
     * Récupère une variable par son code
     */
    public MailTemplateVariableResponse getVariableByCode(String code) {
        MailTemplateVariable variable = mailTemplateVariableRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Variable not found with code: " + code));
        return toResponse(variable);
    }

    /**
     * Crée une nouvelle variable
     */
    public MailTemplateVariableResponse createVariable(MailTemplateVariableResponse request) {
        if (mailTemplateVariableRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Variable with code already exists: " + request.getCode());
        }

        MailTemplateVariable variable = MailTemplateVariable.builder()
                .code(request.getCode())
                .label(request.getLabel())
                .description(request.getDescription())
                .exampleValue(request.getExampleValue())
                .category(request.getCategory())
                .dataType(request.getDataType())
                .required(request.getRequired() != null ? request.getRequired() : false)
                .active(request.getActive() != null ? request.getActive() : true)
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .pattern(request.getPattern())
                .applicableMailTypes(request.getApplicableMailTypes())
                .build();

        variable = mailTemplateVariableRepository.save(variable);
        return toResponse(variable);
    }

    /**
     * Met à jour une variable existante
     */
    public MailTemplateVariableResponse updateVariable(UUID id, MailTemplateVariableResponse request) {
        MailTemplateVariable variable = mailTemplateVariableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Variable not found with id: " + id));

        if (!variable.getCode().equals(request.getCode()) && mailTemplateVariableRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Variable with code already exists: " + request.getCode());
        }

        variable.setCode(request.getCode());
        variable.setLabel(request.getLabel());
        variable.setDescription(request.getDescription());
        variable.setExampleValue(request.getExampleValue());
        variable.setCategory(request.getCategory());
        variable.setDataType(request.getDataType());
        variable.setRequired(request.getRequired() != null ? request.getRequired() : false);
        variable.setActive(request.getActive() != null ? request.getActive() : true);
        variable.setDisplayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0);
        variable.setPattern(request.getPattern());
        variable.setApplicableMailTypes(request.getApplicableMailTypes());

        variable = mailTemplateVariableRepository.save(variable);
        return toResponse(variable);
    }

    /**
     * Supprime une variable
     */
    public void deleteVariable(UUID id) {
        MailTemplateVariable variable = mailTemplateVariableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Variable not found with id: " + id));
        mailTemplateVariableRepository.delete(variable);
    }

    /**
     * Convertit une entité en DTO
     */
    private MailTemplateVariableResponse toResponse(MailTemplateVariable variable) {
        return MailTemplateVariableResponse.builder()
                .id(variable.getId())
                .code(variable.getCode())
                .label(variable.getLabel())
                .description(variable.getDescription())
                .exampleValue(variable.getExampleValue())
                .category(variable.getCategory())
                .dataType(variable.getDataType())
                .required(variable.getRequired())
                .active(variable.getActive())
                .displayOrder(variable.getDisplayOrder())
                .pattern(variable.getPattern())
                .applicableMailTypes(variable.getApplicableMailTypes())
                .createdAt(variable.getCreatedAt())
                .updatedAt(variable.getUpdatedAt())
                .build();
    }
}
