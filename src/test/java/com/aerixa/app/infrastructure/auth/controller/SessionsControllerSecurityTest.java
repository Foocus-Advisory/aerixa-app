package com.aerixa.app.infrastructure.auth.controller;

import com.aerixa.app.application.auth.service.SessionService;
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
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
    controllers = SessionsController.class,
    excludeFilters = @ComponentScan.Filter(
        type = FilterType.ASSIGNABLE_TYPE,
        classes = {AuditLoggingFilter.class, JwtAuthenticationFilter.class}
    )
)
@AutoConfigureMockMvc
@Import(MethodSecurityTestConfig.class)
class SessionsControllerSecurityTest {

    private static final String ACTOR_ID = "11111111-1111-1111-1111-111111111111";
    private static final String SESSION_ID = "22222222-2222-2222-2222-222222222222";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SessionService sessionService;

    @MockitoBean
    private AuditLogRepository auditLogRepository;

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"sessions:read_own"})
    void listOwnSessions_withPermission_returnsOk() throws Exception {
        mockMvc.perform(get("/api/v1/auth/sessions"))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"sessions:read_children"})
    void listOwnSessions_withoutPermission_returnsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/auth/sessions"))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"sessions:revoke_own"})
    void revokeOwnSession_withPermission_returnsNoContent() throws Exception {
        doNothing().when(sessionService).revokeSession(any(), any());

        mockMvc.perform(delete("/api/v1/auth/sessions/{sessionId}", SESSION_ID))
            .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"sessions:read_own"})
    void revokeOwnSession_withoutPermission_returnsForbidden() throws Exception {
        mockMvc.perform(delete("/api/v1/auth/sessions/{sessionId}", SESSION_ID))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"sessions:revoke_others"})
    void revokeOthers_withPermission_returnsNoContent() throws Exception {
        doNothing().when(sessionService).revokeOtherSessions(any(), any());

        mockMvc.perform(post("/api/v1/auth/sessions/revoke-others"))
            .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"sessions:revoke_own"})
    void revokeOthers_withoutPermission_returnsForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/auth/sessions/revoke-others"))
            .andExpect(status().isForbidden());
    }
}
