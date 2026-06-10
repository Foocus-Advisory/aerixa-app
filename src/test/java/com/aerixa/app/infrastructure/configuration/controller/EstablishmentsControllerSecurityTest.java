package com.aerixa.app.infrastructure.configuration.controller;

import com.aerixa.app.application.configuration.dto.EstablishmentResponse;
import com.aerixa.app.application.configuration.service.EstablishmentService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = EstablishmentsController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = {AuditLoggingFilter.class, JwtAuthenticationFilter.class}
        )
)
@AutoConfigureMockMvc
@Import(MethodSecurityTestConfig.class)
class EstablishmentsControllerSecurityTest {

    private static final String ACTOR_ID = "11111111-1111-1111-1111-111111111111";
    private static final String ESTABLISHMENT_ID = "33333333-3333-3333-3333-333333333333";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EstablishmentService establishmentService;

    @MockitoBean
    private AuditLogRepository auditLogRepository;

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"establishments:list"})
    void listWithPermissionReturnsOk() throws Exception {
                given(establishmentService.listEstablishments(any(UUID.class), anyString())).willReturn(List.of());

        mockMvc.perform(get("/api/v1/establishments"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"establishments:read"})
    void listWithoutListPermissionReturnsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/establishments"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"establishments:create"})
    void createWithPermissionReturnsCreated() throws Exception {
                given(establishmentService.createEstablishment(any(UUID.class), any(), anyString()))
                .willReturn(EstablishmentResponse.builder().id(UUID.fromString(ESTABLISHMENT_ID)).code("EST1").name("E1").status("ACTIVE").build());

        mockMvc.perform(post("/api/v1/establishments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"EST1\",\"name\":\"E1\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"establishments:list"})
    void createWithoutCreatePermissionReturnsForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/establishments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"EST1\",\"name\":\"E1\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"establishments:update"})
    void updateWithPermissionReturnsOk() throws Exception {
                given(establishmentService.updateEstablishment(any(UUID.class), any(UUID.class), any(), anyString()))
                .willReturn(EstablishmentResponse.builder().id(UUID.fromString(ESTABLISHMENT_ID)).code("EST1").name("E1").status("ACTIVE").build());

        mockMvc.perform(patch("/api/v1/establishments/{id}", ESTABLISHMENT_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"New\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"establishments:read"})
    void updateWithoutPermissionReturnsForbidden() throws Exception {
        mockMvc.perform(patch("/api/v1/establishments/{id}", ESTABLISHMENT_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"New\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"establishments:activate"})
    void activateWithPermissionReturnsOk() throws Exception {
        given(establishmentService.activateEstablishment(any(UUID.class), any(UUID.class), anyString()))
                .willReturn(EstablishmentResponse.builder().id(UUID.fromString(ESTABLISHMENT_ID)).status("ACTIVE").build());

        mockMvc.perform(post("/api/v1/establishments/{id}/activate", ESTABLISHMENT_ID))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"establishments:read"})
    void activateWithoutPermissionReturnsForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/establishments/{id}/activate", ESTABLISHMENT_ID))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"establishments:deactivate"})
    void deactivateWithPermissionReturnsOk() throws Exception {
        given(establishmentService.deactivateEstablishment(any(UUID.class), any(UUID.class), anyString()))
                .willReturn(EstablishmentResponse.builder().id(UUID.fromString(ESTABLISHMENT_ID)).status("INACTIVE").build());

        mockMvc.perform(post("/api/v1/establishments/{id}/deactivate", ESTABLISHMENT_ID))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"establishments:read"})
    void deactivateWithoutPermissionReturnsForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/establishments/{id}/deactivate", ESTABLISHMENT_ID))
                .andExpect(status().isForbidden());
    }
}
