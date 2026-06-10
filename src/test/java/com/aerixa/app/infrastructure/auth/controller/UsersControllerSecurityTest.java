package com.aerixa.app.infrastructure.auth.controller;

import com.aerixa.app.application.auth.dto.PagedResponse;
import com.aerixa.app.application.auth.dto.UserResponse;
import com.aerixa.app.application.auth.service.ProfileLocationService;
import com.aerixa.app.application.auth.service.UserManagementService;
import com.aerixa.app.domain.auth.repository.AuditLogRepository;
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

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
    controllers = UsersController.class,
    excludeFilters = @ComponentScan.Filter(
        type = FilterType.ASSIGNABLE_TYPE,
        classes = {AuditLoggingFilter.class, JwtAuthenticationFilter.class}
    )
)
@AutoConfigureMockMvc
@Import(MethodSecurityTestConfig.class)
class UsersControllerSecurityTest {

    private static final String ACTOR_ID = "11111111-1111-1111-1111-111111111111";
    private static final String TARGET_ID = "22222222-2222-2222-2222-222222222222";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserManagementService userManagementService;

    @MockitoBean
    private ProfileLocationService profileLocationService;

    @MockitoBean
    private AuditLogRepository auditLogRepository;

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"users:read_all"})
    void listUsers_withReadPermission_returnsOk() throws Exception {
        given(userManagementService.listUsers(any(UUID.class), anyInt(), anyInt(), anyString(), anyString(), any()))
            .willReturn(PagedResponse.<UserResponse>builder().content(List.of()).page(0).size(20).totalElements(0).totalPages(0).build());

        mockMvc.perform(get("/api/v1/users"))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"users:create"})
    void listUsers_withoutReadPermission_returnsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"users:create"})
    void createUser_withPermission_returnsCreated() throws Exception {
        given(userManagementService.createUser(any(), any(UUID.class)))
            .willReturn(UserResponse.builder().id(UUID.fromString(TARGET_ID)).email("user@aerixa.com").roles(Set.of("OPERATOR")).build());

        mockMvc.perform(post("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"user@aerixa.com\",\"password\":\"StrongPass123!\",\"roles\":[\"OPERATOR\"]}"))
            .andExpect(status().isCreated());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"users:read_all"})
    void createUser_withoutPermission_returnsForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"user@aerixa.com\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"users:hard_delete"})
    void hardDelete_withDedicatedPermission_returnsOk() throws Exception {
        doNothing().when(userManagementService).hardDeleteUser(any(UUID.class), any(UUID.class));

        mockMvc.perform(delete("/api/v1/users/{id}/hard", TARGET_ID))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"users:delete"})
    void hardDelete_withOnlySoftDeletePermission_returnsForbidden() throws Exception {
        mockMvc.perform(delete("/api/v1/users/{id}/hard", TARGET_ID))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"users:delete"})
    void softDelete_withPermission_returnsOk() throws Exception {
        doNothing().when(userManagementService).softDeleteUser(any(UUID.class), any(UUID.class));

        mockMvc.perform(delete("/api/v1/users/{id}", TARGET_ID))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"users:read_all"})
    void softDelete_withoutPermission_returnsForbidden() throws Exception {
        mockMvc.perform(delete("/api/v1/users/{id}", TARGET_ID))
            .andExpect(status().isForbidden());
    }
}
