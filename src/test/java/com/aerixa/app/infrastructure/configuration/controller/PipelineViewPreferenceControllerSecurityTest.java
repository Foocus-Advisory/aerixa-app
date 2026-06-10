package com.aerixa.app.infrastructure.configuration.controller;

import com.aerixa.app.application.configuration.dto.PipelineViewPreferenceResponse;
import com.aerixa.app.application.configuration.service.UserPipelineViewPreferenceService;
import com.aerixa.app.domain.auth.repository.AuditLogRepository;
import com.aerixa.app.domain.configuration.entity.PipelineViewType;
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

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = PipelineViewPreferenceController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = {AuditLoggingFilter.class, JwtAuthenticationFilter.class}
        )
)
@AutoConfigureMockMvc
@Import(MethodSecurityTestConfig.class)
class PipelineViewPreferenceControllerSecurityTest {

    private static final String ACTOR_ID = "11111111-1111-1111-1111-111111111111";
    private static final String ESTABLISHMENT_ID = "22222222-2222-2222-2222-222222222222";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserPipelineViewPreferenceService userPipelineViewPreferenceService;

    @MockitoBean
    private AuditLogRepository auditLogRepository;

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"pipeline_view_preference:read"})
    void readWithPermissionReturnsOk() throws Exception {
        given(userPipelineViewPreferenceService.read(any(UUID.class), any(UUID.class), anyString()))
                .willReturn(PipelineViewPreferenceResponse.builder()
                        .id(UUID.randomUUID())
                        .userId(UUID.fromString(ACTOR_ID))
                        .establishmentId(UUID.fromString(ESTABLISHMENT_ID))
                        .preferredView(PipelineViewType.KANBAN)
                        .build());

        mockMvc.perform(get("/api/v1/pipeline-view-preference").param("establishmentId", ESTABLISHMENT_ID))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"pipeline_view_preference:update"})
    void updateWithPermissionReturnsOk() throws Exception {
        given(userPipelineViewPreferenceService.update(any(UUID.class), any(), anyString()))
                .willReturn(PipelineViewPreferenceResponse.builder()
                        .id(UUID.randomUUID())
                        .userId(UUID.fromString(ACTOR_ID))
                        .establishmentId(UUID.fromString(ESTABLISHMENT_ID))
                        .preferredView(PipelineViewType.TABLE)
                        .build());

        mockMvc.perform(put("/api/v1/pipeline-view-preference")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"establishmentId\":\"" + ESTABLISHMENT_ID + "\",\"preferredView\":\"TABLE\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"pipeline_view_preference:read"})
    void updateWithoutPermissionReturnsForbidden() throws Exception {
        mockMvc.perform(put("/api/v1/pipeline-view-preference")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"establishmentId\":\"" + ESTABLISHMENT_ID + "\",\"preferredView\":\"TABLE\"}"))
                .andExpect(status().isForbidden());
    }
}
