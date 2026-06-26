package com.aerixa.app.application.auth.service;

import com.aerixa.app.application.auth.dto.ChangePasswordRequest;
import com.aerixa.app.application.auth.dto.CreateUserRequest;
import com.aerixa.app.application.auth.dto.PagedResponse;
import com.aerixa.app.application.auth.dto.PasswordResetRequestResult;
import com.aerixa.app.application.auth.dto.UpdateProfileRequest;
import com.aerixa.app.application.auth.dto.UpdateUserRequest;
import com.aerixa.app.application.auth.dto.UserImportResultResponse;
import com.aerixa.app.application.auth.dto.UserOptionResponse;
import com.aerixa.app.application.auth.dto.UserResponse;
import com.aerixa.app.application.auth.dto.UserStatusStatsResponse;
import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.entity.Session;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.RoleRepository;
import com.aerixa.app.domain.auth.repository.SessionRepository;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.infrastructure.auth.repository.UserJpaRepository;
import com.aerixa.app.infrastructure.error.ResourceNotFoundException;
import com.aerixa.app.infrastructure.notification.PasswordResetMailQueueService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.ArrayList;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserManagementService {

    private final UserRepository userRepository;
    private final UserJpaRepository userJpaRepository;
    private final RoleRepository roleRepository;
    private final SessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetMailQueueService passwordResetMailQueueService;

    private static final String DELETED_FILTER = "DELETED";
    private static final String PERMISSION_USERS_READ_ALL = "users:read_all";
    private static final String PERMISSION_USERS_READ_CHILDREN = "users:read_children";
    private static final String PERMISSION_SESSIONS_READ_ALL = "sessions:read_all";
    private static final String PERMISSION_SESSIONS_READ_CHILDREN = "sessions:read_children";

    @Transactional(readOnly = true)
    public List<UserOptionResponse> listUserOptions(UUID actorUserId) {
        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));

        boolean canReadAllUsers = hasPermission(actor, PERMISSION_USERS_READ_ALL) || actor.hasRole("SUPER_ADMIN");
        boolean canReadChildrenUsers = hasPermission(actor, PERMISSION_USERS_READ_CHILDREN);
        boolean canReadAllSessions = hasPermission(actor, PERMISSION_SESSIONS_READ_ALL);
        boolean canReadChildrenSessions = hasPermission(actor, PERMISSION_SESSIONS_READ_CHILDREN);
        boolean isOperator = actor.hasRole("OPERATOR") && !actor.hasRole("ADMIN") && !actor.hasRole("SUPER_ADMIN");

        if (!canReadAllUsers && !canReadChildrenUsers && !canReadAllSessions && !canReadChildrenSessions && !isOperator) {
            throw new PermissionDeniedException("users:read_all|users:read_children|sessions:read_all|sessions:read_children");
        }

        Sort sort = Sort.by("firstName").ascending()
                .and(Sort.by("lastName").ascending())
                .and(Sort.by("email").ascending());

        List<User> scopedUsers;
        if (canReadAllUsers || canReadAllSessions) {
            scopedUsers = userJpaRepository.findAll(sort);
        } else if (canReadChildrenUsers || canReadChildrenSessions) {
            scopedUsers = userJpaRepository.findAllByParentAdminIdOrSelf(actor.getId(), Pageable.unpaged()).getContent();
        } else {
            scopedUsers = List.of(actor);
        }

        return scopedUsers.stream()
                .map(this::toUserOption)
                .toList();
    }

    @Transactional(readOnly = true)
    public PagedResponse<UserResponse> listUsers(UUID actorUserId, int page, int size, String sortBy, String direction, String status) {
        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
        boolean canReadAll = hasPermission(actor, PERMISSION_USERS_READ_ALL) || actor.hasRole("SUPER_ADMIN");
        boolean canReadChildren = hasPermission(actor, PERMISSION_USERS_READ_CHILDREN);
        boolean isOperator = actor.hasRole("OPERATOR") && !actor.hasRole("ADMIN") && !actor.hasRole("SUPER_ADMIN");

        if (!canReadAll && !canReadChildren && !isOperator) {
            throw new PermissionDeniedException("users:read_all|users:read_children");
        }

        Sort sort = "desc".equalsIgnoreCase(direction)
            ? Sort.by(sortBy).descending()
            : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), sort);

        if (isDeletedFilter(status)) {
            Page<User> deletedPage;
            Pageable deletedPageable = buildDeletedPageable(page, size, sortBy, direction);
            if (canReadAll) {
                deletedPage = userJpaRepository.findAllDeleted(deletedPageable);
            } else if (isOperator) {
                // OPERATOR ne voit pas les utilisateurs supprimés (pas pertinent pour eux)
                return PagedResponse.<UserResponse>builder()
                        .content(List.of())
                        .page(0)
                        .size(0)
                        .totalElements(0)
                        .totalPages(0)
                        .build();
            } else {
                deletedPage = userJpaRepository.findAllDeletedByParentAdminId(actor.getId(), deletedPageable);
            }
            return PagedResponse.<UserResponse>builder()
                    .content(deletedPage.getContent().stream().map(this::toResponse).toList())
                    .page(deletedPage.getNumber())
                    .size(deletedPage.getSize())
                    .totalElements(deletedPage.getTotalElements())
                    .totalPages(deletedPage.getTotalPages())
                    .build();
        }

        User.UserStatus statusFilter = resolveStatusFilter(status);
        Page<User> userPage;
        if (canReadAll) {
            userPage = statusFilter == null
                ? userJpaRepository.findAll(pageable)
                : userJpaRepository.findAllByStatus(statusFilter, pageable);
        } else if (isOperator) {
            // OPERATOR voit uniquement son propre compte
            boolean matchesStatus = statusFilter == null || statusFilter == actor.getStatus();
            List<User> content = matchesStatus ? List.of(actor) : List.of();
            userPage = new org.springframework.data.domain.PageImpl<>(content, pageable, matchesStatus ? 1 : 0);
        } else {
            userPage = statusFilter == null
                ? userJpaRepository.findAllByParentAdminIdOrSelf(actor.getId(), pageable)
                : userJpaRepository.findAllByParentAdminIdOrSelfAndStatus(actor.getId(), statusFilter, pageable);
        }

        return PagedResponse.<UserResponse>builder()
                .content(userPage.getContent().stream().map(this::toResponse).toList())
                .page(userPage.getNumber())
                .size(userPage.getSize())
                .totalElements(userPage.getTotalElements())
                .totalPages(userPage.getTotalPages())
                .build();
    }

    @Transactional(readOnly = true)
        public UserStatusStatsResponse getUserStatusStats(UUID actorUserId) {
        User actor = userRepository.findById(actorUserId)
            .orElseThrow(() -> new UserNotFoundException(actorUserId));
        boolean canReadAll = hasPermission(actor, PERMISSION_USERS_READ_ALL) || actor.hasRole("SUPER_ADMIN");
        boolean isOperator = actor.hasRole("OPERATOR") && !actor.hasRole("ADMIN") && !actor.hasRole("SUPER_ADMIN");

        if (canReadAll) {
            return UserStatusStatsResponse.builder()
                .total(userJpaRepository.count())
                .active(userJpaRepository.countByStatus(User.UserStatus.ACTIVE))
                .disabled(userJpaRepository.countByStatus(User.UserStatus.DISABLED))
                .pendingVerification(userJpaRepository.countByStatus(User.UserStatus.PENDING_VERIFICATION))
                .deleted(userJpaRepository.countDeleted())
                .build();
        }

        if (isOperator) {
            // OPERATOR voit ses stats personnelles uniquement
            return UserStatusStatsResponse.builder()
                .total(1)
                .active(actor.getStatus() == User.UserStatus.ACTIVE ? 1 : 0)
                .disabled(actor.getStatus() == User.UserStatus.DISABLED ? 1 : 0)
                .pendingVerification(actor.getStatus() == User.UserStatus.PENDING_VERIFICATION ? 1 : 0)
                .deleted(0)
                .build();
        }

        List<User> managedUsers = userJpaRepository.findAllByParentAdminIdOrSelf(actor.getId(), Pageable.unpaged()).getContent();
        long active = managedUsers.stream().filter(user -> user.getStatus() == User.UserStatus.ACTIVE).count();
        long disabled = managedUsers.stream().filter(user -> user.getStatus() == User.UserStatus.DISABLED).count();
        long pending = managedUsers.stream().filter(user -> user.getStatus() == User.UserStatus.PENDING_VERIFICATION).count();
        long deleted = userJpaRepository.findAllDeletedByParentAdminId(actor.getId(), Pageable.unpaged()).getTotalElements();

        return UserStatusStatsResponse.builder()
            .total(managedUsers.size())
            .active(active)
            .disabled(disabled)
            .pendingVerification(pending)
            .deleted(deleted)
                .build();
    }

    @Transactional(readOnly = true)
    public byte[] exportUsersToExcel(UUID actorUserId, String status) {
        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
        boolean canReadAll = hasPermission(actor, PERMISSION_USERS_READ_ALL) || actor.hasRole("SUPER_ADMIN");

        User.UserStatus statusFilter = resolveStatusFilter(status);
        Sort sort = Sort.by("createdAt").descending();
        List<User> users;
        if (canReadAll) {
            users = statusFilter == null
                    ? userJpaRepository.findAll(sort)
                    : userJpaRepository.findByStatus(statusFilter, sort);
        } else {
            users = statusFilter == null
                    ? userJpaRepository.findAllByParentAdminIdOrSelf(actor.getId(), Pageable.unpaged()).getContent()
                    : userJpaRepository.findAllByParentAdminIdOrSelfAndStatus(actor.getId(), statusFilter, Pageable.unpaged()).getContent();
            users = users.stream().sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt())).toList();
        }

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("users");

            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("firstName");
            header.createCell(1).setCellValue("lastName");
            header.createCell(2).setCellValue("email");
            header.createCell(3).setCellValue("status");
            header.createCell(4).setCellValue("roles");
            header.createCell(5).setCellValue("lastLoginAt");
            header.createCell(6).setCellValue("createdAt");

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            int rowIndex = 1;
            for (User user : users) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(nullSafe(user.getFirstName()));
                row.createCell(1).setCellValue(nullSafe(user.getLastName()));
                row.createCell(2).setCellValue(nullSafe(user.getEmail()));
                row.createCell(3).setCellValue(user.getStatus().name());
                row.createCell(4).setCellValue(user.getRoles().stream().map(Role::getName).collect(Collectors.joining(",")));
                row.createCell(5).setCellValue(user.getLastLoginAt() == null ? "" : formatter.format(user.getLastLoginAt()));
                row.createCell(6).setCellValue(user.getCreatedAt() == null ? "" : formatter.format(user.getCreatedAt()));
            }

            for (int i = 0; i <= 6; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Impossible de générer l'export Excel des utilisateurs", exception);
        }
    }

    @Transactional(readOnly = true)
    public byte[] generateImportTemplateExcel() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("import-users-template");

            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("email*");
            header.createCell(1).setCellValue("password*");
            header.createCell(2).setCellValue("firstName");
            header.createCell(3).setCellValue("lastName");
            header.createCell(4).setCellValue("username");
            header.createCell(5).setCellValue("phoneNumber");
            header.createCell(6).setCellValue("roles");
            header.createCell(7).setCellValue("status");

            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue("jane.doe@aerixa.com");
            sample.createCell(1).setCellValue("ChangeMe2026");
            sample.createCell(2).setCellValue("Jane");
            sample.createCell(3).setCellValue("Doe");
            sample.createCell(4).setCellValue("jane.doe");
            sample.createCell(5).setCellValue("690000000");
            sample.createCell(6).setCellValue("OPERATOR");
            sample.createCell(7).setCellValue("ACTIVE");

            Sheet metadata = workbook.createSheet("metadata");
            metadata.createRow(0).createCell(0).setCellValue("roles autorises: SUPER_ADMIN,ADMIN,SUPERVISOR,OPERATOR");
            metadata.createRow(1).createCell(0).setCellValue("status autorises: ACTIVE,DISABLED,PENDING_VERIFICATION");
            metadata.createRow(2).createCell(0).setCellValue("roles: plusieurs valeurs possibles separees par une virgule");

            for (int i = 0; i <= 7; i++) {
                sheet.autoSizeColumn(i);
            }
            metadata.autoSizeColumn(0);

            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Impossible de générer le template d'import Excel", exception);
        }
    }

    @Transactional
    public UserImportResultResponse importUsersFromExcel(MultipartFile file, UUID actorUserId) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier d'import est vide");
        }

        DataFormatter formatter = new DataFormatter();
        int totalRows = 0;
        int created = 0;
        List<String> errors = new java.util.ArrayList<>();

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);

            for (int rowIndex = 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null || isEmptyRow(row, formatter)) {
                    continue;
                }

                totalRows++;
                try {
                    String email = readCellValue(row, 0, formatter);
                    String password = readCellValue(row, 1, formatter);
                    String firstName = readCellValue(row, 2, formatter);
                    String lastName = readCellValue(row, 3, formatter);
                    String username = readCellValue(row, 4, formatter);
                    String phoneNumber = readCellValue(row, 5, formatter);
                    String rolesRaw = readCellValue(row, 6, formatter);
                    String statusRaw = readCellValue(row, 7, formatter);

                    Set<String> roles = rolesRaw.isBlank()
                            ? Set.of("OPERATOR")
                            : java.util.Arrays.stream(rolesRaw.split(","))
                            .map(String::trim)
                            .filter(value -> !value.isBlank())
                            .collect(Collectors.toSet());

                    CreateUserRequest request = CreateUserRequest.builder()
                            .email(email)
                            .password(password)
                            .firstName(firstName.isBlank() ? null : firstName)
                            .lastName(lastName.isBlank() ? null : lastName)
                            .username(username.isBlank() ? null : username)
                            .phoneNumber(phoneNumber.isBlank() ? null : phoneNumber)
                            .roles(roles)
                            .build();

                    UserResponse createdUser = createUser(request, actorUserId);
                    if ("DISABLED".equalsIgnoreCase(statusRaw)) {
                        toggleStatus(actorUserId, createdUser.getId());
                    }
                    created++;
                } catch (Exception exception) {
                    errors.add("Ligne " + (rowIndex + 1) + ": " + exception.getMessage());
                }
            }
        } catch (IOException exception) {
            throw new IllegalArgumentException("Format de fichier invalide pour l'import Excel", exception);
        }

        return UserImportResultResponse.builder()
                .totalRows(totalRows)
                .created(created)
                .failed(errors.size())
                .errors(errors)
                .build();
    }

    @Transactional(readOnly = true)
    public UserResponse getUser(UUID actorUserId, UUID userId) {
        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
        User user = userJpaRepository.findByIdIncludingDeleted(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        if (!canManageOrView(actor, user)) {
            throw new PermissionDeniedException("users:read_all|users:read_children");
        }

        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UUID actorUserId) {
        User user = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
        return toResponse(user);
    }

    @Transactional
    public UserResponse updateUser(UUID actorUserId, UUID targetUserId, UpdateUserRequest request) {
        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
        User target = userJpaRepository.findByIdIncludingDeleted(targetUserId)
                .orElseThrow(() -> new UserNotFoundException(targetUserId));

        if (target.isDeleted()) {
            throw new IllegalArgumentException("Impossible de modifier un utilisateur supprime");
        }

        enforceActorCanManageTarget(actor, target);

        if (request.getUsername() != null) {
            target.setUsername(request.getUsername().isBlank() ? null : request.getUsername().trim());
        }
        if (request.getFirstName() != null) {
            target.setFirstName(request.getFirstName().isBlank() ? null : request.getFirstName().trim());
        }
        if (request.getLastName() != null) {
            target.setLastName(request.getLastName().isBlank() ? null : request.getLastName().trim());
        }
        if (request.getPhoneNumber() != null) {
            target.setPhoneNumber(request.getPhoneNumber().isBlank() ? null : request.getPhoneNumber().trim());
        }
        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            Set<Role> resolvedRoles = resolveRoles(request.getRoles());
            enforceRoleCreation(actor, resolvedRoles);
            target.setRoles(resolvedRoles);
        }

        return toResponse(userRepository.save(target));
    }

    @Transactional
    public UserResponse assignParentAdmin(UUID actorUserId, UUID targetUserId, UUID parentAdminId) {
        if (parentAdminId == null) {
            throw new IllegalArgumentException("Le parent ADMIN est obligatoire");
        }

        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
        User target = userJpaRepository.findByIdIncludingDeleted(targetUserId)
                .orElseThrow(() -> new UserNotFoundException(targetUserId));

        if (target.isDeleted()) {
            throw new IllegalArgumentException("Impossible d'affecter un parent a un utilisateur supprime");
        }

        if (!target.hasRole("OPERATOR")) {
            throw new IllegalArgumentException("L'affectation parent est reservee aux utilisateurs OPERATOR");
        }

        enforceActorCanManageTarget(actor, target);

        User parentAdmin = userJpaRepository.findByIdIncludingDeleted(parentAdminId)
                .orElseThrow(() -> new UserNotFoundException(parentAdminId));

        if (parentAdmin.isDeleted()) {
            throw new IllegalArgumentException("Le parent selectionne est supprime");
        }

        if (!parentAdmin.hasRole("ADMIN") && !parentAdmin.hasRole("SUPER_ADMIN")) {
            throw new IllegalArgumentException("Le parent selectionne doit etre ADMIN ou SUPER_ADMIN");
        }

        target.setParentAdmin(parentAdmin);
        return toResponse(userRepository.save(target));
    }

    @Transactional
    public UserResponse updateCurrentUserProfile(UUID actorUserId, UpdateProfileRequest request) {
        User user = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));

        applyProfileFields(user, request);
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse updateCurrentUserProfilePhoto(UUID actorUserId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier image est obligatoire");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new IllegalArgumentException("Le fichier doit être une image valide");
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("La photo de profil ne doit pas dépasser 5 Mo");
        }

        User user = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));

        try {
            user.setProfilePhoto(file.getBytes());
        } catch (IOException exception) {
            throw new IllegalArgumentException("Impossible de lire la photo de profil", exception);
        }

        user.setProfilePhotoContentType(contentType);
        user.setProfilePhotoFilename(file.getOriginalFilename());

        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse deleteCurrentUserProfilePhoto(UUID actorUserId) {
        User user = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));

        user.setProfilePhoto(null);
        user.setProfilePhotoContentType(null);
        user.setProfilePhotoFilename(null);

        return toResponse(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public ProfilePhotoContent getUserProfilePhoto(UUID actorUserId, UUID targetUserId) {
        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
        User target = userJpaRepository.findByIdIncludingDeleted(targetUserId)
                .orElseThrow(() -> new UserNotFoundException(targetUserId));

        if (!actor.getId().equals(target.getId()) && !canManageOrView(actor, target)) {
            throw new PermissionDeniedException("users:read_all|users:read_children");
        }

        if (!target.hasProfilePhoto()) {
            throw new ResourceNotFoundException("Photo de profil introuvable");
        }

        return new ProfilePhotoContent(
                target.getProfilePhoto(),
                target.getProfilePhotoContentType() == null ? "application/octet-stream" : target.getProfilePhotoContentType(),
                target.getProfilePhotoFilename());
    }

    @Transactional
    public void changeCurrentUserPassword(UUID actorUserId, ChangePasswordRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("La requête de changement de mot de passe est obligatoire");
        }
        if (request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
            throw new IllegalArgumentException("Le mot de passe actuel est obligatoire");
        }
        if (request.getNewPassword() == null || request.getNewPassword().isBlank()) {
            throw new IllegalArgumentException("Le nouveau mot de passe est obligatoire");
        }

        User user = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Le mot de passe actuel est incorrect");
        }

        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            throw new IllegalArgumentException("Le nouveau mot de passe doit être différent de l'ancien");
        }

        validatePasswordPolicy(request.getNewPassword());

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChangedAt(LocalDateTime.now());
        user.setMustChangePassword(false);
        userRepository.save(user);
    }

    @Transactional
    public UserResponse createUser(CreateUserRequest request, UUID actorUserId) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new IllegalArgumentException("L'email est obligatoire");
        }

        String rawPassword = request.getPassword();
        if (rawPassword == null || rawPassword.isBlank()) {
            rawPassword = buildTemporaryPassword();
        } else {
            validatePasswordPolicy(rawPassword);
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Un utilisateur avec cet email existe déjà");
        }

        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));

        Set<Role> resolvedRoles = resolveRoles(request.getRoles());
        enforceRoleCreation(actor, resolvedRoles);

        enforceAdminCreationScope(actor, resolvedRoles);
        User parentAdmin = resolveParentAdmin(actor, request.getParentAdminId(), resolvedRoles);

        User user = User.builder()
                .email(request.getEmail())
                .username(request.getUsername())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phoneNumber(request.getPhoneNumber())
                .passwordHash(passwordEncoder.encode(rawPassword))
                .status(User.UserStatus.ACTIVE)
                .emailVerified(false)
                .mustChangePassword(true)
            .parentAdmin(parentAdmin)
                .roles(resolvedRoles)
                .build();

        User savedUser = userRepository.save(user);

        try {
            passwordResetMailQueueService.enqueueInitialPasswordInvitationMail(savedUser.getEmail());
        } catch (Exception exception) {
            log.warn("Failed to enqueue initial password invitation mail for user {}", savedUser.getEmail(), exception);
        }

        return toResponse(savedUser);
    }

    @Transactional
    public UserResponse toggleStatus(UUID actorUserId, UUID targetUserId) {
        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new UserNotFoundException(targetUserId));

        enforceActorCanManageTarget(actor, target);

        if (target.getStatus() == User.UserStatus.DISABLED) {
            target.setStatus(User.UserStatus.ACTIVE);
        } else {
            target.setStatus(User.UserStatus.DISABLED);
        }

        return toResponse(userRepository.save(target));
    }

    @Transactional
    public void revokeSessions(UUID actorUserId, UUID targetUserId) {
        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new UserNotFoundException(targetUserId));

        enforceActorCanManageTarget(actor, target);

        List<Session> activeSessions = sessionRepository.findAllActiveSessionsByUserId(target.getId());
        LocalDateTime now = LocalDateTime.now();
        for (Session session : activeSessions) {
            session.setRevokedAt(now);
            sessionRepository.save(session);
        }
    }

    @Transactional
    public void softDeleteUser(UUID actorUserId, UUID targetUserId) {
        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
        User target = userJpaRepository.findByIdIncludingDeleted(targetUserId)
                .orElseThrow(() -> new UserNotFoundException(targetUserId));

        if (actor.getId().equals(target.getId())) {
            throw new IllegalArgumentException("Suppression de son propre compte interdite");
        }

        if (target.isDeleted()) {
            throw new IllegalArgumentException("Utilisateur deja supprime");
        }

        enforceActorCanManageTarget(actor, target);
        userRepository.delete(target);
    }

    @Transactional
    public void restoreUser(UUID actorUserId, UUID targetUserId) {
        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
        User target = userJpaRepository.findByIdIncludingDeleted(targetUserId)
                .orElseThrow(() -> new UserNotFoundException(targetUserId));

        if (!target.isDeleted()) {
            throw new IllegalArgumentException("Utilisateur non supprime");
        }

        enforceActorCanManageTarget(actor, target);
        int restored = userJpaRepository.restoreById(targetUserId);
        if (restored == 0) {
            throw new IllegalArgumentException("Restauration impossible");
        }
    }

    @Transactional
    public void hardDeleteUser(UUID actorUserId, UUID targetUserId) {
        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
        User target = userJpaRepository.findByIdIncludingDeleted(targetUserId)
                .orElseThrow(() -> new UserNotFoundException(targetUserId));

        if (!target.isDeleted()) {
            throw new IllegalArgumentException("Suppression definitive reservee aux utilisateurs deja supprimes");
        }

        enforceActorCanManageTarget(actor, target);
        userJpaRepository.deleteSessionsByUserId(targetUserId);
        userJpaRepository.deleteUserRolesByUserId(targetUserId);

        int deleted = userJpaRepository.hardDeleteById(targetUserId);
        if (deleted == 0) {
            throw new IllegalArgumentException("Suppression definitive impossible");
        }
    }

    @Transactional
    public PasswordResetRequestResult resendInitialPasswordInvitation(UUID actorUserId, UUID targetUserId) {
        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
        User target = userJpaRepository.findByIdIncludingDeleted(targetUserId)
                .orElseThrow(() -> new UserNotFoundException(targetUserId));

        if (target.isDeleted()) {
            throw new IllegalArgumentException("Impossible de renvoyer une invitation pour un utilisateur supprime");
        }

        enforceActorCanManageTarget(actor, target);

        boolean neverLoggedIn = target.getLastLoginAt() == null;
        boolean passwordNotDefinedYet = Boolean.TRUE.equals(target.getMustChangePassword());
        if (!neverLoggedIn || !passwordNotDefinedYet) {
            throw new IllegalArgumentException("Le renvoi est autorise uniquement pour un utilisateur qui ne s'est jamais connecte et n'a pas encore defini son mot de passe");
        }

        PasswordResetMailQueueService.MailQueueResult queueResult =
            passwordResetMailQueueService.enqueueInitialPasswordInvitationMail(target.getEmail());

        return PasswordResetRequestResult.builder()
                .accepted(queueResult.isAccepted())
                .queued(queueResult.isQueued())
                .jobId(queueResult.getJobId())
                .recipient(queueResult.getRecipient())
                .fallbackRecipient(queueResult.getFallbackRecipient())
                .build();
    }

    @Transactional
    public PasswordResetRequestResult resetPassword(UUID actorUserId, UUID targetUserId, String temporaryPassword) {
        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
        User target = userJpaRepository.findByIdIncludingDeleted(targetUserId)
                .orElseThrow(() -> new UserNotFoundException(targetUserId));

        if (target.isDeleted()) {
            throw new IllegalArgumentException("Impossible de réinitialiser le mot de passe d'un utilisateur supprimé");
        }

        enforceActorCanManageTarget(actor, target);

        // Generate password if not provided
        String passwordToSet = (temporaryPassword == null || temporaryPassword.isBlank())
                ? buildTemporaryPassword()
                : temporaryPassword;

        // Update user with new password and mark as needing password change
        target.setPasswordHash(passwordEncoder.encode(passwordToSet));
        target.setMustChangePassword(true);
        target.setPasswordChangedAt(LocalDateTime.now());
        userRepository.save(target);

        // Queue password reset email with temporary password
        PasswordResetMailQueueService.MailQueueResult queueResult =
                passwordResetMailQueueService.enqueuePasswordResetMail(target.getEmail(), passwordToSet);

        return PasswordResetRequestResult.builder()
                .accepted(queueResult.isAccepted())
                .queued(queueResult.isQueued())
                .jobId(queueResult.getJobId())
                .recipient(queueResult.getRecipient())
                .fallbackRecipient(queueResult.getFallbackRecipient())
                .build();
    }

    private Set<Role> resolveRoles(Set<String> roleNames) {
        Set<String> requestedRoles = (roleNames == null || roleNames.isEmpty())
                ? Set.of("OPERATOR")
                : roleNames;

        Set<Role> resolved = new HashSet<>();
        for (String roleName : requestedRoles) {
            Role role = roleRepository.findByName(roleName)
                    .orElseThrow(() -> new IllegalArgumentException("Role introuvable: " + roleName));
            resolved.add(role);
        }
        return resolved;
    }

    private void enforceRoleCreation(User actor, Set<Role> targetRoles) {
        int actorLevel = minRoleLevel(actor.getRoles());
        for (Role role : targetRoles) {
            if (role.getLevel() < actorLevel) {
                throw new PermissionDeniedException("users:create");
            }
        }
    }

    private void enforceAdminCreationScope(User actor, Set<Role> targetRoles) {
        boolean isSuperAdmin = actor.hasRole("SUPER_ADMIN");
        boolean isAdmin = actor.hasRole("ADMIN");
        if (isAdmin && !isSuperAdmin) {
            boolean creatingSingleOperator = targetRoles.size() == 1
                    && targetRoles.stream().anyMatch(role -> "OPERATOR".equals(role.getName()));
            if (!creatingSingleOperator) {
                throw new PermissionDeniedException("users:create");
            }
        }
    }

    private User resolveParentAdmin(User actor, UUID requestedParentAdminId, Set<Role> targetRoles) {
        boolean creatingOperator = targetRoles.stream().anyMatch(role -> "OPERATOR".equals(role.getName()));
        if (!creatingOperator) {
            return null;
        }

        boolean isSuperAdmin = actor.hasRole("SUPER_ADMIN");
        boolean isAdmin = actor.hasRole("ADMIN");

        if (isAdmin && !isSuperAdmin) {
            return actor;
        }

        UUID parentAdminId = requestedParentAdminId;
        if (parentAdminId == null) {
            throw new IllegalArgumentException("Un ADMIN parent est obligatoire pour un operateur");
        }

        User parentAdmin = userRepository.findById(parentAdminId)
                .orElseThrow(() -> new UserNotFoundException(parentAdminId));

        if (!parentAdmin.hasRole("ADMIN") && !parentAdmin.hasRole("SUPER_ADMIN")) {
            throw new IllegalArgumentException("Le parent selectionne doit etre ADMIN ou SUPER_ADMIN");
        }

        return parentAdmin;
    }

    private boolean canManageOrView(User actor, User target) {
        boolean canReadAll = hasPermission(actor, PERMISSION_USERS_READ_ALL) || actor.hasRole("SUPER_ADMIN");
        if (canReadAll) {
            return true;
        }

        if (actor.getId().equals(target.getId())) {
            return true;
        }

        boolean canReadChildren = hasPermission(actor, PERMISSION_USERS_READ_CHILDREN);
        if (!canReadChildren) {
            return false;
        }

        return target.getParentAdmin() != null && actor.getId().equals(target.getParentAdmin().getId());
    }

    private boolean hasPermission(User actor, String permissionName) {
        return actor.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .anyMatch(permission -> permissionName.equals(permission.getName()));
    }

    private void enforceActorCanManageTarget(User actor, User target) {
        int actorLevel = minRoleLevel(actor.getRoles());
        int targetLevel = minRoleLevel(target.getRoles());

        if (targetLevel < actorLevel) {
            throw new PermissionDeniedException("users:manage");
        }
    }

    private int minRoleLevel(Set<Role> roles) {
        return roles.stream().map(Role::getLevel).min(Integer::compareTo).orElse(Integer.MAX_VALUE);
    }

    private void validatePasswordPolicy(String password) {
        if (password.length() < 10
                || password.chars().noneMatch(Character::isUpperCase)
                || password.chars().noneMatch(Character::isLowerCase)
                || password.chars().noneMatch(Character::isDigit)) {
            throw new IllegalArgumentException("Mot de passe invalide: minimum 10 caractères, avec majuscule, minuscule et chiffre");
        }
    }

    private void applyProfileFields(User user, UpdateProfileRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Les données du profil sont obligatoires");
        }

        if (request.getUsername() != null) {
            user.setUsername(normalizeValue(request.getUsername()));
        }
        if (request.getFirstName() != null) {
            user.setFirstName(normalizeValue(request.getFirstName()));
        }
        if (request.getLastName() != null) {
            user.setLastName(normalizeValue(request.getLastName()));
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(normalizeValue(request.getPhoneNumber()));
        }
        if (request.getAddressLine1() != null) {
            user.setAddressLine1(normalizeValue(request.getAddressLine1()));
        }
        if (request.getAddressLine2() != null) {
            user.setAddressLine2(normalizeValue(request.getAddressLine2()));
        }
        if (request.getCity() != null) {
            user.setCity(normalizeValue(request.getCity()));
        }
        if (request.getPostalCode() != null) {
            user.setPostalCode(normalizeValue(request.getPostalCode()));
        }
        if (request.getCountry() != null) {
            user.setCountry(normalizeValue(request.getCountry()));
        }
        if (request.getBio() != null) {
            String bio = normalizeValue(request.getBio());
            if (bio != null && bio.length() > 1000) {
                throw new IllegalArgumentException("La bio ne doit pas dépasser 1000 caractères");
            }
            user.setBio(bio);
        }
    }

    private String normalizeValue(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private UserResponse toResponse(User user) {
        Set<String> roles = user.getRoles().stream().map(Role::getName).collect(java.util.stream.Collectors.toSet());
        Set<String> permissions = user.getRoles().stream()
            .flatMap(role -> role.getPermissions().stream())
            .map(permission -> permission.getName())
            .collect(java.util.stream.Collectors.toSet());
        User parentAdmin = user.getParentAdmin();
        String parentDisplayName = null;
        if (parentAdmin != null) {
            String fullName = ((parentAdmin.getFirstName() == null ? "" : parentAdmin.getFirstName().trim()) + " "
                + (parentAdmin.getLastName() == null ? "" : parentAdmin.getLastName().trim())).trim();
            parentDisplayName = fullName.isBlank() ? parentAdmin.getEmail() : fullName;
        }

        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phoneNumber(user.getPhoneNumber())
                .addressLine1(user.getAddressLine1())
                .addressLine2(user.getAddressLine2())
                .city(user.getCity())
                .postalCode(user.getPostalCode())
                .country(user.getCountry())
                .bio(user.getBio())
                .profilePhotoUrl(user.hasProfilePhoto() ? "/api/v1/users/" + user.getId() + "/profile-photo" : null)
                .status(user.getStatus().name())
                .emailVerified(Boolean.TRUE.equals(user.getEmailVerified()))
                .mustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()))
                .roles(roles)
                .permissions(permissions)
            .parentAdminId(parentAdmin != null ? parentAdmin.getId() : null)
            .parentAdminEmail(parentAdmin != null ? parentAdmin.getEmail() : null)
            .parentAdminDisplayName(parentDisplayName)
                .lastLoginAt(user.getLastLoginAt())
                .deletedAt(user.getDeletedAt())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    private UserOptionResponse toUserOption(User user) {
        String firstName = user.getFirstName() == null ? "" : user.getFirstName().trim();
        String lastName = user.getLastName() == null ? "" : user.getLastName().trim();
        String displayName = (firstName + " " + lastName).trim();
        if (displayName.isBlank()) {
            String username = user.getUsername() == null ? "" : user.getUsername().trim();
            displayName = username.isBlank() ? user.getEmail() : username;
        }

        return UserOptionResponse.builder()
                .id(user.getId())
                .displayName(displayName)
                .email(user.getEmail())
                .build();
    }

    public record ProfilePhotoContent(byte[] content, String contentType, String fileName) {
    }

    private User.UserStatus resolveStatusFilter(String status) {
        if (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)) {
            return null;
        }

        try {
            return User.UserStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Statut invalide: " + status);
        }
    }

    private boolean isDeletedFilter(String status) {
        return status != null && DELETED_FILTER.equalsIgnoreCase(status.trim());
    }

    private Pageable buildDeletedPageable(int page, int size, String sortBy, String direction) {
        // Les requetes deleted sont natives: il faut trier par noms de colonnes SQL.
        String normalized = sortBy == null ? "createdAt" : sortBy.trim();
        String sqlSortBy = switch (normalized) {
            case "createdAt" -> "created_at";
            case "updatedAt" -> "updated_at";
            case "deletedAt" -> "deleted_at";
            case "firstName" -> "first_name";
            case "lastName" -> "last_name";
            case "phoneNumber" -> "phone_number";
            case "parentAdminId" -> "parent_admin_id";
            case "email", "username", "status" -> normalized;
            default -> "created_at";
        };

        Sort sort = "desc".equalsIgnoreCase(direction)
                ? Sort.by(sqlSortBy).descending()
                : Sort.by(sqlSortBy).ascending();

        return PageRequest.of(Math.max(page, 0), Math.max(size, 1), sort);
    }

    private String readCellValue(Row row, int index, DataFormatter formatter) {
        Cell cell = row.getCell(index);
        if (cell == null) {
            return "";
        }
        return formatter.formatCellValue(cell).trim();
    }

    private boolean isEmptyRow(Row row, DataFormatter formatter) {
        for (int i = 0; i <= 7; i++) {
            if (!readCellValue(row, i, formatter).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }

    private static String buildTemporaryPassword() {
        String uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        String lowercase = "abcdefghijkmnpqrstuvwxyz";
        String digits = "23456789";
        String symbols = "!@#$%&*";
        String all = uppercase + lowercase + digits + symbols;

        java.util.Random random = new java.util.Random();
        java.util.List<Character> chars = new java.util.ArrayList<>();

        chars.add(uppercase.charAt(random.nextInt(uppercase.length())));
        chars.add(lowercase.charAt(random.nextInt(lowercase.length())));
        chars.add(digits.charAt(random.nextInt(digits.length())));
        chars.add(symbols.charAt(random.nextInt(symbols.length())));

        for (int i = chars.size(); i < 14; i++) {
            chars.add(all.charAt(random.nextInt(all.length())));
        }

        java.util.Collections.shuffle(chars);

        StringBuilder password = new StringBuilder();
        for (Character c : chars) {
            password.append(c);
        }

        return password.toString();
    }
}
