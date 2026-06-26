package com.aerixa.app.application.configuration.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.dto.CreateFunnelStageRequest;
import com.aerixa.app.application.configuration.dto.FunnelStageResponse;
import com.aerixa.app.application.configuration.dto.UpdateFunnelStageRequest;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.EstablishmentAccessGuard;
import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.configuration.entity.FunnelStage;
import com.aerixa.app.domain.configuration.entity.FunnelStageType;
import com.aerixa.app.infrastructure.configuration.repository.FunnelStageJpaRepository;
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
class FunnelStageServiceTest {

    @Mock
    private FunnelStageJpaRepository funnelStageJpaRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ConfigurationPermissionGuard permissionGuard;

    @Mock
    private EstablishmentAccessGuard establishmentAccessGuard;

    @Mock
    private ConfigurationAuditPublisher auditPublisher;

    @InjectMocks
    private FunnelStageService funnelStageService;

    private User admin;
    private UUID establishmentId;

    @BeforeEach
    void setUp() {
        establishmentId = UUID.randomUUID();
        admin = User.builder().roles(Set.of(Role.builder().name("ADMIN").permissions(Set.of()).build())).build();
        admin.setId(UUID.randomUUID());
    }

    @Test
    void createShouldRejectDuplicateActiveInitial() {
        CreateFunnelStageRequest request = CreateFunnelStageRequest.builder()
                .establishmentId(establishmentId)
                .code("INIT")
                .name("Debut")
                .stageType(FunnelStageType.INITIAL)
                .positionOrder(1)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(funnelStageJpaRepository.existsByEstablishmentIdAndCodeIgnoreCase(establishmentId, "INIT")).thenReturn(false);
        when(funnelStageJpaRepository.existsByEstablishmentIdAndPositionOrderAndActiveTrue(establishmentId, 1)).thenReturn(false);
        when(funnelStageJpaRepository.countByEstablishmentIdAndStageTypeAndActiveTrue(establishmentId, FunnelStageType.INITIAL)).thenReturn(1L);

        assertThrows(IllegalArgumentException.class,
                () -> funnelStageService.create(admin.getId(), request, "corr-fs-1"));
    }

    @Test
    void createShouldPersistStage() {
        CreateFunnelStageRequest request = CreateFunnelStageRequest.builder()
                .establishmentId(establishmentId)
                .code("INT1")
                .name("Qualification")
                .stageType(FunnelStageType.INTERMEDIATE)
                .positionOrder(2)
                .build();

        FunnelStage saved = FunnelStage.builder()
                .id(UUID.randomUUID())
                .establishmentId(establishmentId)
                .code("INT1")
                .name("Qualification")
                .stageType(FunnelStageType.INTERMEDIATE)
                .positionOrder(2)
                .active(true)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(funnelStageJpaRepository.existsByEstablishmentIdAndCodeIgnoreCase(establishmentId, "INT1")).thenReturn(false);
        when(funnelStageJpaRepository.existsByEstablishmentIdAndPositionOrderAndActiveTrue(establishmentId, 2)).thenReturn(false);
        when(funnelStageJpaRepository.save(any(FunnelStage.class))).thenReturn(saved);

        FunnelStageResponse response = funnelStageService.create(admin.getId(), request, "corr-fs-2");

        assertEquals("INT1", response.getCode());
        assertEquals(FunnelStageType.INTERMEDIATE, response.getStageType());
    }

    @Test
    void listShouldReturnScopedStages() {
        FunnelStage stage = FunnelStage.builder()
                .id(UUID.randomUUID())
                .establishmentId(establishmentId)
                .code("INT1")
                .name("Qualification")
                .stageType(FunnelStageType.INTERMEDIATE)
                .positionOrder(2)
                .active(true)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(funnelStageJpaRepository.findAllByEstablishmentId(any(UUID.class), any(org.springframework.data.domain.Sort.class)))
                .thenReturn(List.of(stage));

        List<FunnelStageResponse> response = funnelStageService.list(admin.getId(), establishmentId, "corr-fs-3");

        assertEquals(1, response.size());
    }

    @Test
    void updateShouldChangeNameAndPosition() {
        UUID stageId = UUID.randomUUID();
        FunnelStage stage = FunnelStage.builder()
                .id(stageId)
                .establishmentId(establishmentId)
                .code("INT1")
                .name("Old")
                .stageType(FunnelStageType.INTERMEDIATE)
                .positionOrder(2)
                .active(true)
                .build();

        UpdateFunnelStageRequest request = UpdateFunnelStageRequest.builder()
                .name("New")
                .positionOrder(3)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(funnelStageJpaRepository.findByIdAndEstablishmentId(stageId, establishmentId)).thenReturn(Optional.of(stage));
        when(funnelStageJpaRepository.existsByEstablishmentIdAndPositionOrderAndActiveTrueAndIdNot(establishmentId, 3, stageId)).thenReturn(false);
        when(funnelStageJpaRepository.save(any(FunnelStage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FunnelStageResponse response = funnelStageService.update(admin.getId(), establishmentId, stageId, request, "corr-fs-4");

        assertEquals("New", response.getName());
        assertEquals(3, response.getPositionOrder());
    }
}
