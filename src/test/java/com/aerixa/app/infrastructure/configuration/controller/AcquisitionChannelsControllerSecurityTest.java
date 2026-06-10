package com.aerixa.app.infrastructure.configuration.controller;

import com.aerixa.app.application.configuration.dto.AcquisitionChannelResponse;
import com.aerixa.app.application.configuration.service.AcquisitionChannelService;
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
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = AcquisitionChannelsController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = {AuditLoggingFilter.class, JwtAuthenticationFilter.class}
        )
)
@AutoConfigureMockMvc
@Import(MethodSecurityTestConfig.class)
class AcquisitionChannelsControllerSecurityTest {

    private static final String ACTOR_ID = "11111111-1111-1111-1111-111111111111";
    private static final String ESTABLISHMENT_ID = "22222222-2222-2222-2222-222222222222";
    private static final String CHANNEL_ID = "33333333-3333-3333-3333-333333333333";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AcquisitionChannelService acquisitionChannelService;

    @MockitoBean
    private AuditLogRepository auditLogRepository;

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"acquisition_channels:list"})
    void listWithPermissionReturnsOk() throws Exception {
        given(acquisitionChannelService.list(any(UUID.class), any(UUID.class), anyString())).willReturn(List.of());

        mockMvc.perform(get("/api/v1/acquisition-channels").param("establishmentId", ESTABLISHMENT_ID))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"acquisition_channels:create"})
    void createWithPermissionReturnsCreated() throws Exception {
        given(acquisitionChannelService.create(any(UUID.class), any(), anyString()))
                .willReturn(AcquisitionChannelResponse.builder().id(UUID.fromString(CHANNEL_ID)).code("WEB").name("Website").active(true).build());

        mockMvc.perform(post("/api/v1/acquisition-channels")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"establishmentId\":\"" + ESTABLISHMENT_ID + "\",\"code\":\"WEB\",\"name\":\"Website\",\"type\":\"DIRECT\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"acquisition_channels:read"})
    void createWithoutPermissionReturnsForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/acquisition-channels")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"establishmentId\":\"" + ESTABLISHMENT_ID + "\",\"code\":\"WEB\",\"name\":\"Website\",\"type\":\"DIRECT\"}"))
                .andExpect(status().isForbidden());
    }
}
