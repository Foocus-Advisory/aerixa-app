package com.aerixa.app.infrastructure.configuration.controller;

import com.aerixa.app.application.configuration.dto.FunnelStageResponse;
import com.aerixa.app.application.configuration.service.FunnelStageService;
import com.aerixa.app.domain.auth.repository.AuditLogRepository;
import com.aerixa.app.domain.configuration.entity.FunnelStageType;
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
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = FunnelStagesController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = {AuditLoggingFilter.class, JwtAuthenticationFilter.class}
        )
)
@AutoConfigureMockMvc
@Import(MethodSecurityTestConfig.class)
class FunnelStagesControllerSecurityTest {

    private static final String ACTOR_ID = "11111111-1111-1111-1111-111111111111";
    private static final String ESTABLISHMENT_ID = "22222222-2222-2222-2222-222222222222";
    private static final String STAGE_ID = "33333333-3333-3333-3333-333333333333";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FunnelStageService funnelStageService;

    @MockitoBean
    private AuditLogRepository auditLogRepository;

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"funnel_stages:list"})
    void listWithPermissionReturnsOk() throws Exception {
        given(funnelStageService.list(any(UUID.class), any(UUID.class), anyString())).willReturn(List.of());

        mockMvc.perform(get("/api/v1/funnel-stages").param("establishmentId", ESTABLISHMENT_ID))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"funnel_stages:create"})
    void createWithPermissionReturnsCreated() throws Exception {
        given(funnelStageService.create(any(UUID.class), any(), anyString()))
                .willReturn(FunnelStageResponse.builder().id(UUID.fromString(STAGE_ID)).code("INT1").name("Qualification").stageType(FunnelStageType.INTERMEDIATE).positionOrder(2).active(true).build());

        mockMvc.perform(post("/api/v1/funnel-stages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"establishmentId\":\"" + ESTABLISHMENT_ID + "\",\"code\":\"INT1\",\"name\":\"Qualification\",\"stageType\":\"INTERMEDIATE\",\"positionOrder\":2}"))
                .andExpect(status().isCreated());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"funnel_stages:read"})
    void createWithoutPermissionReturnsForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/funnel-stages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"establishmentId\":\"" + ESTABLISHMENT_ID + "\",\"code\":\"INT1\",\"name\":\"Qualification\",\"stageType\":\"INTERMEDIATE\",\"positionOrder\":2}"))
                .andExpect(status().isForbidden());
    }
}
