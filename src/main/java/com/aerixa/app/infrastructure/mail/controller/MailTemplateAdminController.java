package com.aerixa.app.infrastructure.mail.controller;

import com.aerixa.app.application.mail.dto.*;
import com.aerixa.app.application.mail.service.MailTemplateService;
import com.aerixa.app.application.mail.service.MailTemplatePreviewService;
import com.aerixa.app.application.mail.service.MailTemplateVariableService;
import com.aerixa.app.application.mail.service.MailTypeService;
import com.aerixa.app.infrastructure.api.ApiSuccessResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Contrôleur pour l'administration des templates de mail
 * Réservé aux SUPER_ADMIN uniquement
 */
@RestController
@RequestMapping("/api/v1/admin/mail-templates")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Mail Templates Admin", description = "Gestion des templates de mail (SUPER_ADMIN uniquement)")
public class MailTemplateAdminController {

    private final MailTypeService mailTypeService;
    private final MailTemplateService mailTemplateService;
    private final MailTemplatePreviewService mailTemplatePreviewService;
    private final MailTemplateVariableService mailTemplateVariableService;

    // ==================== MAIL TYPES ====================

    /**
     * Liste tous les types de mail
     */
        @GetMapping("/types/categories")
        @PreAuthorize("hasAuthority('email_templates:read')")
        @Operation(summary = "Lister les categories de types de mail")
        public ResponseEntity<ApiSuccessResponse<List<MailTypeCategoryOptionResponse>>> getMailTypeCategories(HttpServletRequest request) {
                List<MailTypeCategoryOptionResponse> categories = mailTypeService.getAvailableCategories();
                ApiSuccessResponse<List<MailTypeCategoryOptionResponse>> response = ApiSuccessResponse.<List<MailTypeCategoryOptionResponse>>builder()
                                .success(true)
                                .message("Mail type categories retrieved successfully")
                                .timestamp(LocalDateTime.now())
                                .path(request.getRequestURI())
                                .statusCode(HttpStatus.OK.value())
                                .data(categories)
                                .build();
                return ResponseEntity.ok(response);
        }

        /**
         * Liste tous les types de mail
         */
    @GetMapping("/types")
        @PreAuthorize("hasAuthority('email_templates:read')")
    @Operation(summary = "Lister tous les types de mail")
    public ResponseEntity<ApiSuccessResponse<List<MailTypeResponse>>> getAllMailTypes(HttpServletRequest request) {
        List<MailTypeResponse> types = mailTypeService.getAllMailTypes();
        ApiSuccessResponse<List<MailTypeResponse>> response = ApiSuccessResponse.<List<MailTypeResponse>>builder()
                .success(true)
                .message("Mail types retrieved successfully")
                .timestamp(LocalDateTime.now())
                .path(request.getRequestURI())
                .statusCode(HttpStatus.OK.value())
                .data(types)
                .build();
        return ResponseEntity.ok(response);
    }

    /**
     * Crée un nouveau type de mail
     */
    @PostMapping("/types")
        @PreAuthorize("hasAuthority('email_templates:create')")
    @Operation(summary = "Créer un nouveau type de mail")
    public ResponseEntity<ApiSuccessResponse<MailTypeResponse>> createMailType(
            @RequestBody @Valid MailTypeRequest request,
            HttpServletRequest httpRequest) {
        MailTypeResponse mailType = mailTypeService.createMailType(request);
        ApiSuccessResponse<MailTypeResponse> response = ApiSuccessResponse.<MailTypeResponse>builder()
                .success(true)
                .message("Mail type created successfully")
                .timestamp(LocalDateTime.now())
                .path(httpRequest.getRequestURI())
                .statusCode(HttpStatus.CREATED.value())
                .data(mailType)
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Récupère un type de mail par son ID
     */
    @GetMapping("/types/{id}")
        @PreAuthorize("hasAuthority('email_templates:read')")
    @Operation(summary = "Récupérer un type de mail par ID")
    public ResponseEntity<ApiSuccessResponse<MailTypeResponse>> getMailType(
            @PathVariable UUID id,
            HttpServletRequest request) {
        MailTypeResponse mailType = mailTypeService.getMailTypeById(id);
        ApiSuccessResponse<MailTypeResponse> response = ApiSuccessResponse.<MailTypeResponse>builder()
                .success(true)
                .message("Mail type retrieved successfully")
                .timestamp(LocalDateTime.now())
                .path(request.getRequestURI())
                .statusCode(HttpStatus.OK.value())
                .data(mailType)
                .build();
        return ResponseEntity.ok(response);
    }

    /**
     * Met à jour un type de mail
     */
    @PutMapping("/types/{id}")
        @PreAuthorize("hasAuthority('email_templates:edit')")
    @Operation(summary = "Mettre à jour un type de mail")
    public ResponseEntity<ApiSuccessResponse<MailTypeResponse>> updateMailType(
            @PathVariable UUID id,
            @RequestBody @Valid MailTypeRequest request,
            HttpServletRequest httpRequest) {
        MailTypeResponse mailType = mailTypeService.updateMailType(id, request);
        ApiSuccessResponse<MailTypeResponse> response = ApiSuccessResponse.<MailTypeResponse>builder()
                .success(true)
                .message("Mail type updated successfully")
                .timestamp(LocalDateTime.now())
                .path(httpRequest.getRequestURI())
                .statusCode(HttpStatus.OK.value())
                .data(mailType)
                .build();
        return ResponseEntity.ok(response);
    }

    /**
     * Supprime un type de mail
     */
    @DeleteMapping("/types/{id}")
        @PreAuthorize("hasAuthority('email_templates:delete')")
    @Operation(summary = "Supprimer un type de mail")
    public ResponseEntity<ApiSuccessResponse<Void>> deleteMailType(
            @PathVariable UUID id,
            HttpServletRequest request) {
        mailTypeService.deleteMailType(id);
        ApiSuccessResponse<Void> response = ApiSuccessResponse.<Void>builder()
                .success(true)
                .message("Mail type deleted successfully")
                .timestamp(LocalDateTime.now())
                .path(request.getRequestURI())
                .statusCode(HttpStatus.OK.value())
                .build();
        return ResponseEntity.ok(response);
    }

    /**
     * Bascule l'état actif/inactif d'un type de mail
     */
    @PatchMapping("/types/{id}/toggle")
        @PreAuthorize("hasAuthority('email_templates:edit')")
    @Operation(summary = "Basculer l'état actif/inactif")
    public ResponseEntity<ApiSuccessResponse<MailTypeResponse>> toggleMailType(
            @PathVariable UUID id,
            HttpServletRequest request) {
        MailTypeResponse mailType = mailTypeService.toggleMailTypeActive(id);
        ApiSuccessResponse<MailTypeResponse> response = ApiSuccessResponse.<MailTypeResponse>builder()
                .success(true)
                .message("Mail type status toggled successfully")
                .timestamp(LocalDateTime.now())
                .path(request.getRequestURI())
                .statusCode(HttpStatus.OK.value())
                .data(mailType)
                .build();
        return ResponseEntity.ok(response);
    }

    // ==================== MAIL TEMPLATES ====================

    /**
     * Liste tous les templates pour un type de mail
     */
    @GetMapping("/{mailTypeId}/templates")
        @PreAuthorize("hasAuthority('email_templates:read')")
    @Operation(summary = "Lister les templates d'un type de mail")
    public ResponseEntity<ApiSuccessResponse<List<MailTemplateResponse>>> getMailTemplates(
            @PathVariable UUID mailTypeId,
            HttpServletRequest request) {
        List<MailTemplateResponse> templates = mailTemplateService.getTemplatesByMailType(mailTypeId);
        ApiSuccessResponse<List<MailTemplateResponse>> response = ApiSuccessResponse.<List<MailTemplateResponse>>builder()
                .success(true)
                .message("Mail templates retrieved successfully")
                .timestamp(LocalDateTime.now())
                .path(request.getRequestURI())
                .statusCode(HttpStatus.OK.value())
                .data(templates)
                .build();
        return ResponseEntity.ok(response);
    }

    /**
     * Crée ou met à jour un template
     */
    @PostMapping("/{mailTypeId}/templates")
        @PreAuthorize("hasAnyAuthority('email_templates:create','email_templates:edit')")
    @Operation(summary = "Créer ou mettre à jour un template")
    public ResponseEntity<ApiSuccessResponse<MailTemplateResponse>> createOrUpdateTemplate(
            @PathVariable UUID mailTypeId,
            @RequestBody @Valid MailTemplateRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        String userId = authentication.getName();
        MailTemplateResponse template = mailTemplateService.createOrUpdateTemplate(request, userId);
        ApiSuccessResponse<MailTemplateResponse> response = ApiSuccessResponse.<MailTemplateResponse>builder()
                .success(true)
                .message("Mail template saved successfully")
                .timestamp(LocalDateTime.now())
                .path(httpRequest.getRequestURI())
                .statusCode(HttpStatus.CREATED.value())
                .data(template)
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Récupère les versions d'un template
     */
    @GetMapping("/{mailTypeId}/templates/versions")
        @PreAuthorize("hasAuthority('email_templates:read')")
    @Operation(summary = "Lister les versions des templates")
    public ResponseEntity<ApiSuccessResponse<List<MailTemplateResponse>>> getTemplateVersions(
            @PathVariable UUID mailTypeId,
            HttpServletRequest request) {
        List<MailTemplateResponse> versions = mailTemplateService.getTemplateVersions(mailTypeId);
        ApiSuccessResponse<List<MailTemplateResponse>> response = ApiSuccessResponse.<List<MailTemplateResponse>>builder()
                .success(true)
                .message("Template versions retrieved successfully")
                .timestamp(LocalDateTime.now())
                .path(request.getRequestURI())
                .statusCode(HttpStatus.OK.value())
                .data(versions)
                .build();
        return ResponseEntity.ok(response);
    }

    /**
     * Active une version de template
     */
    @PatchMapping("/templates/{templateId}/activate")
        @PreAuthorize("hasAuthority('email_templates:edit')")
    @Operation(summary = "Activer une version de template")
    public ResponseEntity<ApiSuccessResponse<MailTemplateResponse>> activateTemplate(
            @PathVariable UUID templateId,
            HttpServletRequest request) {
        MailTemplateResponse template = mailTemplateService.activateTemplateVersion(templateId);
        ApiSuccessResponse<MailTemplateResponse> response = ApiSuccessResponse.<MailTemplateResponse>builder()
                .success(true)
                .message("Template version activated successfully")
                .timestamp(LocalDateTime.now())
                .path(request.getRequestURI())
                .statusCode(HttpStatus.OK.value())
                .data(template)
                .build();
        return ResponseEntity.ok(response);
    }

        /**
         * Bascule l'etat actif/inactif d'une version de template
         */
        @PatchMapping("/templates/{templateId}/toggle")
        @PreAuthorize("hasAuthority('email_templates:edit')")
        @Operation(summary = "Basculer l'etat actif/inactif d'un template")
        public ResponseEntity<ApiSuccessResponse<MailTemplateResponse>> toggleTemplate(
                        @PathVariable UUID templateId,
                        HttpServletRequest request) {
                MailTemplateResponse template = mailTemplateService.toggleTemplateActive(templateId);
                ApiSuccessResponse<MailTemplateResponse> response = ApiSuccessResponse.<MailTemplateResponse>builder()
                                .success(true)
                                .message("Template status toggled successfully")
                                .timestamp(LocalDateTime.now())
                                .path(request.getRequestURI())
                                .statusCode(HttpStatus.OK.value())
                                .data(template)
                                .build();
                return ResponseEntity.ok(response);
        }

    /**
     * Supprime un template
     */
    @DeleteMapping("/templates/{templateId}")
        @PreAuthorize("hasAuthority('email_templates:delete')")
    @Operation(summary = "Supprimer un template")
    public ResponseEntity<ApiSuccessResponse<Void>> deleteTemplate(
            @PathVariable UUID templateId,
            HttpServletRequest request) {
        mailTemplateService.deleteTemplate(templateId);
        ApiSuccessResponse<Void> response = ApiSuccessResponse.<Void>builder()
                .success(true)
                .message("Template deleted successfully")
                .timestamp(LocalDateTime.now())
                .path(request.getRequestURI())
                .statusCode(HttpStatus.OK.value())
                .build();
        return ResponseEntity.ok(response);
    }

    // ==================== TEMPLATE PREVIEW ====================

    /**
     * Prévisualise un template avec des variables de test
     */
    @PostMapping("/templates/preview")
        @PreAuthorize("hasAuthority('email_templates:test')")
    @Operation(summary = "Prévisualiser un template")
    public ResponseEntity<ApiSuccessResponse<MailTemplatePreviewResponse>> previewTemplate(
            @RequestBody @Valid MailTemplatePreviewRequest request,
            HttpServletRequest httpRequest) {
        MailTemplatePreviewResponse preview = mailTemplatePreviewService.previewTemplate(request);
        ApiSuccessResponse<MailTemplatePreviewResponse> response = ApiSuccessResponse.<MailTemplatePreviewResponse>builder()
                .success(true)
                .message("Template preview generated successfully")
                .timestamp(LocalDateTime.now())
                .path(httpRequest.getRequestURI())
                .statusCode(HttpStatus.OK.value())
                .data(preview)
                .build();
        return ResponseEntity.ok(response);
    }

    // ==================== TEMPLATE VARIABLES ====================

    /**
     * Liste toutes les variables disponibles
     */
    @GetMapping("/variables")
        @PreAuthorize("hasAuthority('email_templates:read')")
    @Operation(summary = "Lister les variables disponibles")
    public ResponseEntity<ApiSuccessResponse<List<MailTemplateVariableResponse>>> getVariables(
            HttpServletRequest request) {
        List<MailTemplateVariableResponse> variables = mailTemplateVariableService.getAllVariables();
        ApiSuccessResponse<List<MailTemplateVariableResponse>> response = ApiSuccessResponse.<List<MailTemplateVariableResponse>>builder()
                .success(true)
                .message("Variables retrieved successfully")
                .timestamp(LocalDateTime.now())
                .path(request.getRequestURI())
                .statusCode(HttpStatus.OK.value())
                .data(variables)
                .build();
        return ResponseEntity.ok(response);
    }

    /**
     * Liste les variables groupées par catégorie
     */
    @GetMapping("/variables/by-category")
        @PreAuthorize("hasAuthority('email_templates:read')")
    @Operation(summary = "Lister les variables par catégorie")
    public ResponseEntity<ApiSuccessResponse<Map<String, List<MailTemplateVariableResponse>>>> getVariablesByCategory(
            HttpServletRequest request) {
        Map<String, List<MailTemplateVariableResponse>> variables = mailTemplateVariableService.getVariablesByCategory();
        ApiSuccessResponse<Map<String, List<MailTemplateVariableResponse>>> response = ApiSuccessResponse.<Map<String, List<MailTemplateVariableResponse>>>builder()
                .success(true)
                .message("Variables retrieved successfully")
                .timestamp(LocalDateTime.now())
                .path(request.getRequestURI())
                .statusCode(HttpStatus.OK.value())
                .data(variables)
                .build();
        return ResponseEntity.ok(response);
    }
}
