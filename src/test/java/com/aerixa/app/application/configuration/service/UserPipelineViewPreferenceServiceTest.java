package com.aerixa.app.application.configuration.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.dto.PipelineViewPreferenceResponse;
import com.aerixa.app.application.configuration.dto.UpdatePipelineViewPreferenceRequest;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.domain.configuration.entity.PipelineViewType;
import com.aerixa.app.domain.configuration.entity.UserPipelineViewPreference;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.UserPipelineViewPreferenceJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserPipelineViewPreferenceServiceTest {

    @Mock
    private UserPipelineViewPreferenceJpaRepository userPipelineViewPreferenceJpaRepository;

    @Mock
    private EstablishmentJpaRepository establishmentJpaRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ConfigurationPermissionGuard permissionGuard;

    @Mock
    private ConfigurationAuditPublisher auditPublisher;

    @InjectMocks
    private UserPipelineViewPreferenceService userPipelineViewPreferenceService;

    private User admin;
    private UUID establishmentId;

    @BeforeEach
    void setUp() {
        establishmentId = UUID.randomUUID();
        admin = User.builder().roles(Set.of(Role.builder().name("ADMIN").permissions(Set.of()).build())).build();
        admin.setId(UUID.randomUUID());
    }

    @Test
    void readShouldReturnDefaultKanbanWhenNoPreferenceExists() {
        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(establishmentJpaRepository.findById(establishmentId)).thenReturn(Optional.of(
                Establishment.builder().id(establishmentId).createdByUserId(admin.getId()).code("EST").name("Est").build()
        ));
        when(userPipelineViewPreferenceJpaRepository.findByUserIdAndEstablishmentId(admin.getId(), establishmentId))
                .thenReturn(Optional.empty());

        PipelineViewPreferenceResponse response = userPipelineViewPreferenceService.read(admin.getId(), establishmentId, "corr-pvp-1");

        assertEquals(PipelineViewType.KANBAN, response.getPreferredView());
        assertEquals(admin.getId(), response.getUserId());
        assertEquals(establishmentId, response.getEstablishmentId());
    }

    @Test
    void updateShouldCreatePreferenceWhenMissing() {
        UpdatePipelineViewPreferenceRequest request = UpdatePipelineViewPreferenceRequest.builder()
                .establishmentId(establishmentId)
                .preferredView(PipelineViewType.TABLE)
                .build();

        UserPipelineViewPreference saved = UserPipelineViewPreference.builder()
                .id(UUID.randomUUID())
                .userId(admin.getId())
                .establishmentId(establishmentId)
                .preferredView(PipelineViewType.TABLE)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(establishmentJpaRepository.findById(establishmentId)).thenReturn(Optional.of(
                Establishment.builder().id(establishmentId).createdByUserId(admin.getId()).code("EST").name("Est").build()
        ));
        when(userPipelineViewPreferenceJpaRepository.findByUserIdAndEstablishmentId(admin.getId(), establishmentId))
                .thenReturn(Optional.empty());
        when(userPipelineViewPreferenceJpaRepository.save(any(UserPipelineViewPreference.class))).thenReturn(saved);

        PipelineViewPreferenceResponse response = userPipelineViewPreferenceService.update(admin.getId(), request, "corr-pvp-2");

        assertEquals(PipelineViewType.TABLE, response.getPreferredView());
        assertEquals(establishmentId, response.getEstablishmentId());
    }

    @Test
    void updateShouldModifyExistingPreference() {
        UpdatePipelineViewPreferenceRequest request = UpdatePipelineViewPreferenceRequest.builder()
                .establishmentId(establishmentId)
                .preferredView(PipelineViewType.LIST)
                .build();

        UserPipelineViewPreference existing = UserPipelineViewPreference.builder()
                .id(UUID.randomUUID())
                .userId(admin.getId())
                .establishmentId(establishmentId)
                .preferredView(PipelineViewType.KANBAN)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(establishmentJpaRepository.findById(establishmentId)).thenReturn(Optional.of(
                Establishment.builder().id(establishmentId).createdByUserId(admin.getId()).code("EST").name("Est").build()
        ));
        when(userPipelineViewPreferenceJpaRepository.findByUserIdAndEstablishmentId(admin.getId(), establishmentId))
                .thenReturn(Optional.of(existing));
        when(userPipelineViewPreferenceJpaRepository.save(any(UserPipelineViewPreference.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PipelineViewPreferenceResponse response = userPipelineViewPreferenceService.update(admin.getId(), request, "corr-pvp-3");

        assertEquals(PipelineViewType.LIST, response.getPreferredView());
    }

    @Test
    void updateShouldRejectMissingPreferredView() {
        UpdatePipelineViewPreferenceRequest request = UpdatePipelineViewPreferenceRequest.builder()
                .establishmentId(establishmentId)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());

        assertThrows(IllegalArgumentException.class,
                () -> userPipelineViewPreferenceService.update(admin.getId(), request, "corr-pvp-4"));
    }
}
