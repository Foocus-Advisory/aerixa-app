package com.aerixa.app.infrastructure.configuration.controller;

import com.aerixa.app.application.configuration.dto.ProgramTrackResponse;
import com.aerixa.app.application.configuration.service.ProgramTrackService;
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
        controllers = ProgramTracksController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = {AuditLoggingFilter.class, JwtAuthenticationFilter.class}
        )
)
@AutoConfigureMockMvc
@Import(MethodSecurityTestConfig.class)
class ProgramTracksControllerSecurityTest {

    private static final String ACTOR_ID = "11111111-1111-1111-1111-111111111111";
    private static final String ESTABLISHMENT_ID = "22222222-2222-2222-2222-222222222222";
    private static final String PROGRAM_TRACK_ID = "33333333-3333-3333-3333-333333333333";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProgramTrackService programTrackService;

    @MockitoBean
    private AuditLogRepository auditLogRepository;

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"program_tracks:list"})
    void listWithPermissionReturnsOk() throws Exception {
        given(programTrackService.list(any(UUID.class), any(UUID.class), anyString())).willReturn(List.of());

        mockMvc.perform(get("/api/v1/program-tracks").param("establishmentId", ESTABLISHMENT_ID))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"program_tracks:create"})
    void createWithPermissionReturnsCreated() throws Exception {
        given(programTrackService.create(any(UUID.class), any(), anyString()))
                .willReturn(ProgramTrackResponse.builder().id(UUID.fromString(PROGRAM_TRACK_ID)).code("GL").name("Genie Logiciel").active(true).build());

        mockMvc.perform(post("/api/v1/program-tracks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"establishmentId\":\"" + ESTABLISHMENT_ID + "\",\"code\":\"GL\",\"name\":\"Genie Logiciel\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"program_tracks:read"})
    void createWithoutPermissionReturnsForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/program-tracks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"establishmentId\":\"" + ESTABLISHMENT_ID + "\",\"code\":\"GL\",\"name\":\"Genie Logiciel\"}"))
                .andExpect(status().isForbidden());
    }
}
