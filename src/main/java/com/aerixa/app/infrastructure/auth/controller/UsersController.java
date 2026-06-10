package com.aerixa.app.infrastructure.auth.controller;

import com.aerixa.app.application.auth.dto.CreateUserRequest;
import com.aerixa.app.application.auth.dto.AssignParentAdminRequest;
import com.aerixa.app.application.auth.dto.ChangePasswordRequest;
import com.aerixa.app.application.auth.dto.PagedResponse;
import com.aerixa.app.application.auth.dto.PasswordResetRequestResult;
import com.aerixa.app.application.auth.dto.ProfileLocationCountryResponse;
import com.aerixa.app.application.auth.dto.ResetPasswordRequest;
import com.aerixa.app.application.auth.dto.UpdateProfileRequest;
import com.aerixa.app.application.auth.dto.UpdateUserRequest;
import com.aerixa.app.application.auth.dto.UserImportResultResponse;
import com.aerixa.app.application.auth.dto.UserOptionResponse;
import com.aerixa.app.application.auth.dto.UserResponse;
import com.aerixa.app.application.auth.dto.UserStatusStatsResponse;
import com.aerixa.app.application.auth.service.ProfileLocationService;
import com.aerixa.app.application.auth.service.UserManagementService;
import com.aerixa.app.infrastructure.api.ApiSuccessResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "Gestion des utilisateurs (RBAC)")
@SecurityRequirement(name = "bearerAuth")
public class UsersController {

    private final UserManagementService userManagementService;
    private final ProfileLocationService profileLocationService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('users:read_all', 'users:read_children')")
    @Operation(summary = "Lister les utilisateurs", description = "Retourne la liste paginée des utilisateurs")
    public ResponseEntity<PagedResponse<UserResponse>> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(required = false) String status,
            Authentication authentication) {
            UUID actorId = currentUserId(authentication);
        return ResponseEntity.ok(userManagementService.listUsers(actorId, page, size, sortBy, direction, status));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyAuthority('users:read_all', 'users:read_children')")
    @Operation(summary = "Statistiques utilisateurs", description = "Retourne les compteurs utilisateurs par statut")
    public ResponseEntity<UserStatusStatsResponse> userStats(Authentication authentication) {
        UUID actorId = currentUserId(authentication);
        return ResponseEntity.ok(userManagementService.getUserStatusStats(actorId));
    }

    @GetMapping("/options")
    @PreAuthorize("hasAnyAuthority('users:read_all', 'users:read_children', 'sessions:read_all', 'sessions:read_children')")
    @Operation(summary = "Options utilisateurs scopees", description = "Retourne une liste minimale d'utilisateurs dans le scope autorise")
    public ResponseEntity<List<UserOptionResponse>> listUserOptions(Authentication authentication) {
        UUID actorId = currentUserId(authentication);
        return ResponseEntity.ok(userManagementService.listUserOptions(actorId));
    }

    @GetMapping(value = "/export", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @PreAuthorize("hasAnyAuthority('users:read_all', 'users:read_children')")
    @Operation(summary = "Exporter les utilisateurs", description = "Exporte les utilisateurs en fichier Excel")
    public ResponseEntity<byte[]> exportUsers(@RequestParam(required = false) String status, Authentication authentication) {
        UUID actorId = currentUserId(authentication);
        byte[] file = userManagementService.exportUsersToExcel(actorId, status);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=users-export.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(file);
    }

    @GetMapping(value = "/import-template", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @PreAuthorize("hasAuthority('users:create')")
    @Operation(summary = "Template import utilisateurs", description = "Telecharge le modele Excel pour l'import utilisateurs")
    public ResponseEntity<byte[]> downloadImportTemplate() {
        byte[] file = userManagementService.generateImportTemplateExcel();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=users-import-template.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(file);
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('users:create')")
    @Operation(summary = "Importer des utilisateurs", description = "Importe des utilisateurs depuis un fichier Excel")
    public ResponseEntity<UserImportResultResponse> importUsers(
            @RequestPart("file") MultipartFile file,
            Authentication authentication) {
        UUID actorId = currentUserId(authentication);
        return ResponseEntity.ok(userManagementService.importUsersFromExcel(file, actorId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('users:read_all', 'users:read_children')")
    @Operation(summary = "Détail utilisateur", description = "Retourne le détail d'un utilisateur")
    public ResponseEntity<UserResponse> getUser(@PathVariable UUID id, Authentication authentication) {
        UUID actorId = currentUserId(authentication);
        return ResponseEntity.ok(userManagementService.getUser(actorId, id));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Profil courant", description = "Retourne le profil de l'utilisateur connecté")
    public ResponseEntity<UserResponse> getCurrentUser(Authentication authentication) {
        UUID actorId = currentUserId(authentication);
        return ResponseEntity.ok(userManagementService.getCurrentUser(actorId));
    }

    @PatchMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mettre à jour son profil", description = "Met à jour les informations du profil courant")
    public ResponseEntity<UserResponse> updateCurrentUser(
            @RequestBody UpdateProfileRequest request,
            Authentication authentication) {
        UUID actorId = currentUserId(authentication);
        return ResponseEntity.ok(userManagementService.updateCurrentUserProfile(actorId, request));
    }

    @GetMapping("/profile-location-options")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Référentiel pays et villes", description = "Retourne les pays et leurs villes pour la saisie du profil")
    public ResponseEntity<List<ProfileLocationCountryResponse>> getProfileLocationOptions() {
        return ResponseEntity.ok(profileLocationService.listCountriesWithCities());
    }

    @PostMapping(value = "/me/profile-photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Téléverser sa photo de profil", description = "Enregistre la photo de profil de l'utilisateur connecté")
    public ResponseEntity<UserResponse> uploadCurrentUserProfilePhoto(
            @RequestPart("file") MultipartFile file,
            Authentication authentication) {
        UUID actorId = currentUserId(authentication);
        return ResponseEntity.ok(userManagementService.updateCurrentUserProfilePhoto(actorId, file));
    }

    @DeleteMapping("/me/profile-photo")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Supprimer sa photo de profil", description = "Supprime la photo de profil du compte connecté")
    public ResponseEntity<UserResponse> deleteCurrentUserProfilePhoto(Authentication authentication) {
        UUID actorId = currentUserId(authentication);
        return ResponseEntity.ok(userManagementService.deleteCurrentUserProfilePhoto(actorId));
    }

    @PostMapping("/me/change-password")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Changer son mot de passe", description = "Change le mot de passe du compte connecté")
    public ResponseEntity<Map<String, String>> changeCurrentUserPassword(
            @RequestBody ChangePasswordRequest request,
            Authentication authentication) {
        UUID actorId = currentUserId(authentication);
        userManagementService.changeCurrentUserPassword(actorId, request);
        return ResponseEntity.ok(Map.of("message", "Mot de passe mis à jour"));
    }

    @GetMapping("/{id}/profile-photo")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Télécharger la photo de profil", description = "Retourne la photo de profil d'un utilisateur si l'accès est autorisé")
    public ResponseEntity<byte[]> getUserProfilePhoto(@PathVariable UUID id, Authentication authentication) {
        UUID actorId = currentUserId(authentication);
        UserManagementService.ProfilePhotoContent photo = userManagementService.getUserProfilePhoto(actorId, id);

        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        try {
            mediaType = MediaType.parseMediaType(photo.contentType());
        } catch (IllegalArgumentException ignored) {
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .body(photo.content());
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('users:edit')")
    @Operation(summary = "Modifier un utilisateur", description = "Met à jour les informations d'un utilisateur")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable UUID id,
            @RequestBody UpdateUserRequest request,
            Authentication authentication) {
        UUID actorId = currentUserId(authentication);
        return ResponseEntity.ok(userManagementService.updateUser(actorId, id, request));
    }

    @PatchMapping("/{id}/parent-admin")
    @PreAuthorize("hasAuthority('users:assign_parent')")
    @Operation(summary = "Affecter un parent ADMIN", description = "Assigne ou modifie le parent ADMIN/SUPER_ADMIN d'un utilisateur OPERATOR")
    public ResponseEntity<UserResponse> assignParentAdmin(
            @PathVariable UUID id,
            @RequestBody AssignParentAdminRequest request,
            Authentication authentication) {
        UUID actorId = currentUserId(authentication);
        UUID parentAdminId = request != null ? request.getParentAdminId() : null;
        return ResponseEntity.ok(userManagementService.assignParentAdmin(actorId, id, parentAdminId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('users:create')")
    @Operation(summary = "Créer un utilisateur", description = "Crée un utilisateur et assigne ses rôles")
    public ResponseEntity<ApiSuccessResponse<UserResponse>> createUser(
            @RequestBody CreateUserRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        UserResponse user = userManagementService.createUser(request, actorId);

        ApiSuccessResponse<UserResponse> response = ApiSuccessResponse.<UserResponse>builder()
                .success(true)
                .message("User created successfully")
                .timestamp(LocalDateTime.now())
                .path(httpRequest.getRequestURI())
                .statusCode(HttpStatus.CREATED.value())
                .data(user)
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('users:toggle_active')")
    @Operation(summary = "Basculer le statut", description = "Active/Désactive un utilisateur")
    public ResponseEntity<UserResponse> toggleStatus(@PathVariable UUID id, Authentication authentication) {
        UUID actorId = currentUserId(authentication);
        return ResponseEntity.ok(userManagementService.toggleStatus(actorId, id));
    }

    @PostMapping("/{id}/revoke-sessions")
    @PreAuthorize("hasAuthority('users:revoke_sessions')")
    @Operation(summary = "Révoquer les sessions", description = "Révoque toutes les sessions actives d'un utilisateur")
    public ResponseEntity<Map<String, String>> revokeSessions(@PathVariable UUID id, Authentication authentication) {
        UUID actorId = currentUserId(authentication);
        userManagementService.revokeSessions(actorId, id);
        return ResponseEntity.ok(Map.of("message", "Sessions révoquées"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('users:delete')")
    @Operation(summary = "Supprimer un utilisateur (soft delete)", description = "Marque un utilisateur comme supprimé")
    public ResponseEntity<Map<String, String>> softDeleteUser(@PathVariable UUID id, Authentication authentication) {
        UUID actorId = currentUserId(authentication);
        userManagementService.softDeleteUser(actorId, id);
        return ResponseEntity.ok(Map.of("message", "Utilisateur supprimé"));
    }

    @PatchMapping("/{id}/restore")
    @PreAuthorize("hasAuthority('users:delete')")
    @Operation(summary = "Restaurer un utilisateur", description = "Restaure un utilisateur supprimé")
    public ResponseEntity<Map<String, String>> restoreUser(@PathVariable UUID id, Authentication authentication) {
        UUID actorId = currentUserId(authentication);
        userManagementService.restoreUser(actorId, id);
        return ResponseEntity.ok(Map.of("message", "Utilisateur restauré"));
    }

    @DeleteMapping("/{id}/hard")
    @PreAuthorize("hasAuthority('users:hard_delete')")
    @Operation(summary = "Supprimer définitivement un utilisateur", description = "Suppression physique de l'utilisateur")
    public ResponseEntity<Map<String, String>> hardDeleteUser(@PathVariable UUID id, Authentication authentication) {
        UUID actorId = currentUserId(authentication);
        userManagementService.hardDeleteUser(actorId, id);
        return ResponseEntity.ok(Map.of("message", "Utilisateur supprimé définitivement"));
    }

    @PostMapping("/{id}/resend-initial-password")
    @PreAuthorize("hasAuthority('users:reset_password')")
    @Operation(summary = "Renvoyer l'invitation mot de passe initial", description = "Autorisé uniquement si l'utilisateur ne s'est jamais connecté et n'a pas encore défini son mot de passe")
    public ResponseEntity<ApiSuccessResponse<PasswordResetRequestResult>> resendInitialPassword(
            @PathVariable UUID id,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        PasswordResetRequestResult result = userManagementService.resendInitialPasswordInvitation(actorId, id);

        ApiSuccessResponse<PasswordResetRequestResult> response = ApiSuccessResponse.<PasswordResetRequestResult>builder()
                .success(true)
                .message("Initial password invitation sent")
                .timestamp(LocalDateTime.now())
                .path(httpRequest.getRequestURI())
                .statusCode(HttpStatus.OK.value())
                .data(result)
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasAuthority('users:reset_password')")
    @Operation(summary = "Réinitialiser le mot de passe d'un utilisateur", description = "Admin action: reset user password and send reset instructions via email")
    public ResponseEntity<ApiSuccessResponse<PasswordResetRequestResult>> resetPassword(
            @PathVariable UUID id,
            @RequestBody(required = false) ResetPasswordRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String temporaryPassword = request != null ? request.getPassword() : null;
        PasswordResetRequestResult result = userManagementService.resetPassword(actorId, id, temporaryPassword);

        ApiSuccessResponse<PasswordResetRequestResult> response = ApiSuccessResponse.<PasswordResetRequestResult>builder()
                .success(true)
                .message("Password reset and invitation sent")
                .timestamp(LocalDateTime.now())
                .path(httpRequest.getRequestURI())
                .statusCode(HttpStatus.OK.value())
                .data(result)
                .build();

        return ResponseEntity.ok(response);
    }

    private UUID currentUserId(Authentication authentication) {
        Authentication resolved = authentication != null ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (resolved == null || resolved.getName() == null) {
            throw new IllegalStateException("Utilisateur authentifie introuvable");
        }
        return UUID.fromString(resolved.getName());
    }
}
