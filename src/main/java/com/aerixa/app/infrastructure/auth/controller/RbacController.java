package com.aerixa.app.infrastructure.auth.controller;

import com.aerixa.app.application.auth.dto.RbacPermissionResponse;
import com.aerixa.app.application.auth.dto.RbacRoleResponse;
import com.aerixa.app.application.auth.dto.UpdateRbacRolePermissionsRequest;
import com.aerixa.app.domain.auth.entity.Permission;
import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.infrastructure.auth.repository.PermissionJpaRepository;
import com.aerixa.app.infrastructure.auth.repository.RoleJpaRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.HashSet;

@RestController
@RequestMapping("/api/v1/rbac")
@RequiredArgsConstructor
@Tag(name = "RBAC", description = "Consultation des rôles, permissions et assignations")
@SecurityRequirement(name = "bearerAuth")
public class RbacController {

    private final RoleJpaRepository roleJpaRepository;
    private final PermissionJpaRepository permissionJpaRepository;

    @GetMapping("/permissions")
    @PreAuthorize("hasAuthority('permissions:read')")
    @Operation(summary = "Lister les permissions", description = "Retourne toutes les permissions actives en base")
    public ResponseEntity<List<RbacPermissionResponse>> listPermissions() {
        List<RbacPermissionResponse> result = permissionJpaRepository.findAllByOrderByModuleAscNameAsc()
                .stream()
                .map(this::toPermissionResponse)
                .toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/roles")
    @PreAuthorize("hasAuthority('roles:read')")
    @Operation(summary = "Lister les rôles et assignations", description = "Retourne les rôles avec permissions assignées et nombre d'utilisateurs")
    public ResponseEntity<List<RbacRoleResponse>> listRoles() {
        Map<UUID, Long> usersCountByRole = countActiveUsersByRole();

        List<RbacRoleResponse> result = roleJpaRepository.findAllByOrderByLevelAscNameAsc()
                .stream()
                .map(role -> toRoleResponse(role, usersCountByRole.getOrDefault(role.getId(), 0L)))
                .toList();

        return ResponseEntity.ok(result);
    }

    @PatchMapping("/roles/{roleId}/permissions")
    @PreAuthorize("hasAuthority('roles:manage_permissions')")
    @Transactional
    @Operation(summary = "Mettre à jour les permissions d'un rôle", description = "Remplace l'ensemble des permissions d'un rôle")
    public ResponseEntity<RbacRoleResponse> updateRolePermissions(
            @PathVariable UUID roleId,
            @RequestBody UpdateRbacRolePermissionsRequest request
    ) {
        Role role = ((com.aerixa.app.domain.auth.repository.RoleRepository) roleJpaRepository).findById(roleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rôle introuvable"));

        Set<UUID> requestedPermissionIds = request.getPermissionIds() == null
                ? Set.of()
                : new HashSet<>(request.getPermissionIds());
        Set<UUID> loadedPermissionIds = permissionJpaRepository.findAllById(requestedPermissionIds)
                .stream()
                .map(Permission::getId)
                .collect(Collectors.toSet());

        if (loadedPermissionIds.size() != requestedPermissionIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Une ou plusieurs permissions sont invalides");
        }

        Set<Permission> updatedPermissions = permissionJpaRepository.findAllById(requestedPermissionIds)
                .stream()
                .collect(Collectors.toCollection(HashSet::new));

        role.setPermissions(updatedPermissions);
        Role savedRole = ((com.aerixa.app.domain.auth.repository.RoleRepository) roleJpaRepository).save(role);

        return ResponseEntity.ok(toRoleResponse(savedRole, countActiveUsersByRole().getOrDefault(roleId, 0L)));
    }

    private RbacPermissionResponse toPermissionResponse(Permission permission) {
        return RbacPermissionResponse.builder()
                .id(permission.getId())
                .name(permission.getName())
                .description(permission.getDescription())
                .module(permission.getModule())
                .action(permission.getAction())
                .build();
    }

    private RbacRoleResponse toRoleResponse(Role role, long usersCount) {
        Set<String> permissions = role.getPermissions()
                .stream()
                .map(Permission::getName)
                .collect(Collectors.toCollection(java.util.TreeSet::new));

        return RbacRoleResponse.builder()
                .id(role.getId())
                .name(role.getName())
                .description(role.getDescription())
                .level(role.getLevel())
                .isSystem(role.getIsSystem())
                .usersCount(usersCount)
                .permissions(permissions)
                .build();
    }

        private Map<UUID, Long> countActiveUsersByRole() {
                return roleJpaRepository.countActiveUsersByRole()
                                .stream()
                                .collect(Collectors.toMap(RoleJpaRepository.RoleUserCountRow::getRoleId, RoleJpaRepository.RoleUserCountRow::getUsersCount));
        }
}
