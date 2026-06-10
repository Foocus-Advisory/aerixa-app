package com.aerixa.app.infrastructure.auth.controller;

import com.aerixa.app.domain.auth.entity.Permission;
import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.infrastructure.auth.repository.PermissionJpaRepository;
import com.aerixa.app.infrastructure.auth.repository.RoleJpaRepository;
import com.aerixa.app.infrastructure.audit.AuditLoggingFilter;
import com.aerixa.app.infrastructure.security.JwtAuthenticationFilter;
import com.aerixa.app.infrastructure.support.MethodSecurityTestConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
    controllers = RbacController.class,
    excludeFilters = @ComponentScan.Filter(
        type = FilterType.ASSIGNABLE_TYPE,
        classes = {AuditLoggingFilter.class, JwtAuthenticationFilter.class}
    )
)
@AutoConfigureMockMvc
@Import(MethodSecurityTestConfig.class)
class RbacControllerSecurityTest {

    private static final UUID ROLE_ID = UUID.fromString("00000000-0000-0000-0000-000000000123");
    private static final UUID PERMISSION_ID = UUID.fromString("00000000-0000-0000-0000-000000000456");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RoleJpaRepository roleJpaRepository;

    @MockitoBean
    private PermissionJpaRepository permissionJpaRepository;

    @Test
    @WithMockUser(authorities = {"roles:read"})
    void listRoles_withPermission_returnsOk() throws Exception {
        Role role = Role.builder()
                .id(ROLE_ID)
                .name("ADMIN")
                .description("Administrateur")
                .level(1)
                .isSystem(true)
                .permissions(Set.of())
                .build();

        when(roleJpaRepository.countActiveUsersByRole()).thenReturn(List.of());
        when(roleJpaRepository.findAllByOrderByLevelAscNameAsc()).thenReturn(List.of(role));

        mockMvc.perform(get("/api/v1/rbac/roles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("ADMIN"));
    }

    @Test
    @WithMockUser(authorities = {"roles:manage_permissions"})
    void updateRolePermissions_withPermission_returnsOk() throws Exception {
        Permission permission = Permission.builder()
                .id(PERMISSION_ID)
                .name("business_configuration:access")
                .description("Acceder au module Configuration metier")
                .module("business_configuration")
                .action("access")
                .build();
        Role role = Role.builder()
                .id(ROLE_ID)
                .name("CUSTOM")
                .description("Custom role")
                .level(2)
                .isSystem(false)
                .permissions(Set.of())
                .build();
        role.setPermissions(Set.of(permission));

        when(((com.aerixa.app.domain.auth.repository.RoleRepository) roleJpaRepository).findById(ROLE_ID)).thenReturn(java.util.Optional.of(role));
        when(permissionJpaRepository.findAllById(Set.of(PERMISSION_ID))).thenReturn(List.of(permission));
        when(((com.aerixa.app.domain.auth.repository.RoleRepository) roleJpaRepository).save(any(Role.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(roleJpaRepository.countActiveUsersByRole()).thenReturn(List.of());

        mockMvc.perform(patch("/api/v1/rbac/roles/{roleId}/permissions", ROLE_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"permissionIds\":[\"00000000-0000-0000-0000-000000000456\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.permissions[0]").value("business_configuration:access"));
    }

    @Test
    @WithMockUser(authorities = {"roles:read"})
    void updateRolePermissions_withoutPermission_returnsForbidden() throws Exception {
        mockMvc.perform(patch("/api/v1/rbac/roles/{roleId}/permissions", ROLE_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"permissionIds\":[]}"))
                .andExpect(status().isForbidden());
    }
}