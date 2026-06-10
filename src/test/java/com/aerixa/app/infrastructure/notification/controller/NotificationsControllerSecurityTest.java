package com.aerixa.app.infrastructure.notification.controller;

import com.aerixa.app.application.auth.dto.PagedResponse;
import com.aerixa.app.application.notification.dto.NotificationBulkActionResponse;
import com.aerixa.app.application.notification.dto.NotificationResponse;
import com.aerixa.app.application.notification.dto.NotificationUnreadCountResponse;
import com.aerixa.app.application.notification.service.NotificationService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
    controllers = NotificationsController.class,
    excludeFilters = @ComponentScan.Filter(
        type = FilterType.ASSIGNABLE_TYPE,
        classes = {AuditLoggingFilter.class, JwtAuthenticationFilter.class}
    )
)
@AutoConfigureMockMvc
@Import(MethodSecurityTestConfig.class)
class NotificationsControllerSecurityTest {

    private static final String ACTOR_ID = "11111111-1111-1111-1111-111111111111";
    private static final String NOTIF_ID = "22222222-2222-2222-2222-222222222222";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private NotificationService notificationService;

    @MockitoBean
    private AuditLogRepository auditLogRepository;

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"notifications:read"})
    void listNotifications_withReadPermission_returnsOk() throws Exception {
        given(notificationService.listUserNotifications(any(), anyInt(), anyInt(), any()))
            .willReturn(PagedResponse.<NotificationResponse>builder().content(List.of()).page(0).size(10).totalElements(0).totalPages(0).build());

        mockMvc.perform(get("/api/v1/notifications"))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"notifications:edit"})
    void listNotifications_withoutReadPermission_returnsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/notifications"))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"notifications:read"})
    void unreadCount_withReadPermission_returnsOk() throws Exception {
        given(notificationService.getUnreadCount(any())).willReturn(NotificationUnreadCountResponse.builder().unreadCount(0L).build());

        mockMvc.perform(get("/api/v1/notifications/unread-count"))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"notifications:edit"})
    void bulkReadStatus_withEditPermission_returnsOk() throws Exception {
        given(notificationService.updateBulkReadStatus(any(), any()))
            .willReturn(NotificationBulkActionResponse.builder().affectedCount(1).build());

        mockMvc.perform(patch("/api/v1/notifications/read-status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"ids\":[\"" + NOTIF_ID + "\"],\"read\":true}"))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"notifications:read"})
    void bulkReadStatus_withoutEditPermission_returnsForbidden() throws Exception {
        mockMvc.perform(patch("/api/v1/notifications/read-status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"ids\":[\"" + NOTIF_ID + "\"],\"read\":true}"))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"notifications:delete"})
    void deleteNotification_withDeletePermission_returnsNoContent() throws Exception {
        doNothing().when(notificationService).deleteNotification(any(), any());

        mockMvc.perform(delete("/api/v1/notifications/{id}", NOTIF_ID))
            .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(username = ACTOR_ID, authorities = {"notifications:edit"})
    void bulkDelete_withoutDeletePermission_returnsForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/notifications/bulk-delete")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"ids\":[\"" + NOTIF_ID + "\"]}"))
            .andExpect(status().isForbidden());
    }
}
