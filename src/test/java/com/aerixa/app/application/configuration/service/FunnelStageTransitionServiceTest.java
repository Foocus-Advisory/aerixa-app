package com.aerixa.app.application.configuration.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.dto.CreateFunnelStageTransitionRequest;
import com.aerixa.app.application.configuration.dto.FunnelStageTransitionResponse;
import com.aerixa.app.application.configuration.dto.UpdateFunnelStageTransitionRequest;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.domain.configuration.entity.FunnelStage;
import com.aerixa.app.domain.configuration.entity.FunnelStageTransition;
import com.aerixa.app.domain.configuration.entity.FunnelStageType;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.FunnelStageJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.FunnelStageTransitionJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
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
class FunnelStageTransitionServiceTest {

    @Mock
    private FunnelStageTransitionJpaRepository funnelStageTransitionJpaRepository;

    @Mock
    private FunnelStageJpaRepository funnelStageJpaRepository;

    @Mock
    private EstablishmentJpaRepository establishmentJpaRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ConfigurationPermissionGuard permissionGuard;

    @Mock
    private ConfigurationAuditPublisher auditPublisher;

    @InjectMocks
    private FunnelStageTransitionService funnelStageTransitionService;

    private User admin;
    private UUID establishmentId;

    @BeforeEach
    void setUp() {
        establishmentId = UUID.randomUUID();
        admin = User.builder().roles(Set.of(Role.builder().name("ADMIN").permissions(Set.of()).build())).build();
        admin.setId(UUID.randomUUID());
    }

    @Test
    void createShouldRejectSelfLoop() {
        UUID stageId = UUID.randomUUID();

        CreateFunnelStageTransitionRequest request = CreateFunnelStageTransitionRequest.builder()
                .establishmentId(establishmentId)
                .fromStageId(stageId)
                .toStageId(stageId)
                .build();

        FunnelStage stage = FunnelStage.builder()
                .id(stageId)
                .establishmentId(establishmentId)
                .code("INT1")
                .name("Qualification")
                .stageType(FunnelStageType.INTERMEDIATE)
                .positionOrder(2)
                .active(true)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(establishmentJpaRepository.findById(establishmentId)).thenReturn(Optional.of(
                Establishment.builder().id(establishmentId).createdByUserId(admin.getId()).code("EST").name("Est").build()
        ));
        when(funnelStageJpaRepository.findByIdAndEstablishmentId(stageId, establishmentId)).thenReturn(Optional.of(stage));

        assertThrows(IllegalArgumentException.class,
                () -> funnelStageTransitionService.create(admin.getId(), request, "corr-fst-1"));
    }

    @Test
    void createShouldPersistTransition() {
        UUID fromId = UUID.randomUUID();
        UUID toId = UUID.randomUUID();

        CreateFunnelStageTransitionRequest request = CreateFunnelStageTransitionRequest.builder()
                .establishmentId(establishmentId)
                .fromStageId(fromId)
                .toStageId(toId)
                .build();

        FunnelStage from = FunnelStage.builder().id(fromId).establishmentId(establishmentId).code("INT1").name("Q").stageType(FunnelStageType.INTERMEDIATE).positionOrder(2).active(true).build();
        FunnelStage to = FunnelStage.builder().id(toId).establishmentId(establishmentId).code("INT2").name("E").stageType(FunnelStageType.INTERMEDIATE).positionOrder(3).active(true).build();
        FunnelStageTransition saved = FunnelStageTransition.builder()
                .id(UUID.randomUUID())
                .establishmentId(establishmentId)
                .fromStageId(fromId)
                .toStageId(toId)
                .active(true)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(establishmentJpaRepository.findById(establishmentId)).thenReturn(Optional.of(
                Establishment.builder().id(establishmentId).createdByUserId(admin.getId()).code("EST").name("Est").build()
        ));
        when(funnelStageJpaRepository.findByIdAndEstablishmentId(fromId, establishmentId)).thenReturn(Optional.of(from));
        when(funnelStageJpaRepository.findByIdAndEstablishmentId(toId, establishmentId)).thenReturn(Optional.of(to));
        when(funnelStageTransitionJpaRepository.existsByEstablishmentIdAndFromStageIdAndToStageId(establishmentId, fromId, toId)).thenReturn(false);
        when(funnelStageTransitionJpaRepository.save(any(FunnelStageTransition.class))).thenReturn(saved);

        FunnelStageTransitionResponse response = funnelStageTransitionService.create(admin.getId(), request, "corr-fst-2");

        assertEquals(fromId, response.getFromStageId());
        assertEquals(toId, response.getToStageId());
    }

    @Test
    void listShouldReturnScopedTransitions() {
        FunnelStageTransition item = FunnelStageTransition.builder()
                .id(UUID.randomUUID())
                .establishmentId(establishmentId)
                .fromStageId(UUID.randomUUID())
                .toStageId(UUID.randomUUID())
                .active(true)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(establishmentJpaRepository.findById(establishmentId)).thenReturn(Optional.of(
                Establishment.builder().id(establishmentId).createdByUserId(admin.getId()).code("EST").name("Est").build()
        ));
        when(funnelStageTransitionJpaRepository.findAllByEstablishmentId(any(UUID.class), any(org.springframework.data.domain.Sort.class)))
                .thenReturn(List.of(item));

        List<FunnelStageTransitionResponse> response = funnelStageTransitionService.list(admin.getId(), establishmentId, "corr-fst-3");

        assertEquals(1, response.size());
    }

    @Test
    void updateShouldChangeToStage() {
        UUID transitionId = UUID.randomUUID();
        UUID fromId = UUID.randomUUID();
        UUID toId = UUID.randomUUID();

        FunnelStageTransition item = FunnelStageTransition.builder()
                .id(transitionId)
                .establishmentId(establishmentId)
                .fromStageId(fromId)
                .toStageId(UUID.randomUUID())
                .active(true)
                .build();

        FunnelStage to = FunnelStage.builder().id(toId).establishmentId(establishmentId).code("INT2").name("E").stageType(FunnelStageType.INTERMEDIATE).positionOrder(3).active(true).build();

        UpdateFunnelStageTransitionRequest request = UpdateFunnelStageTransitionRequest.builder()
                .toStageId(toId)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(establishmentJpaRepository.findById(establishmentId)).thenReturn(Optional.of(
                Establishment.builder().id(establishmentId).createdByUserId(admin.getId()).code("EST").name("Est").build()
        ));
        when(funnelStageTransitionJpaRepository.findByIdAndEstablishmentId(transitionId, establishmentId)).thenReturn(Optional.of(item));
        when(funnelStageJpaRepository.findByIdAndEstablishmentId(toId, establishmentId)).thenReturn(Optional.of(to));
        when(funnelStageTransitionJpaRepository.existsByEstablishmentIdAndFromStageIdAndToStageIdAndIdNot(establishmentId, fromId, toId, transitionId)).thenReturn(false);
        when(funnelStageTransitionJpaRepository.save(any(FunnelStageTransition.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FunnelStageTransitionResponse response = funnelStageTransitionService.update(admin.getId(), establishmentId, transitionId, request, "corr-fst-4");

        assertEquals(toId, response.getToStageId());
    }
}
