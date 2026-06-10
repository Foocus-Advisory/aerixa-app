package com.aerixa.app.application.configuration.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.dto.AcademicLevelResponse;
import com.aerixa.app.application.configuration.dto.CreateAcademicLevelRequest;
import com.aerixa.app.application.configuration.dto.UpdateAcademicLevelRequest;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.EstablishmentScopeGuard;
import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.configuration.entity.AcademicLevel;
import com.aerixa.app.infrastructure.configuration.repository.AcademicLevelJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
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
class AcademicLevelServiceTest {

    @Mock
    private AcademicLevelJpaRepository academicLevelJpaRepository;

    @Mock
    private UserRepository userRepository;

        @Mock
        private EstablishmentJpaRepository establishmentJpaRepository;

    @Mock
    private ConfigurationPermissionGuard permissionGuard;

    @Mock
    private EstablishmentScopeGuard establishmentScopeGuard;

    @Mock
    private ConfigurationAuditPublisher auditPublisher;

    @InjectMocks
    private AcademicLevelService academicLevelService;

    private User admin;
    private UUID establishmentId;

    @BeforeEach
    void setUp() {
        establishmentId = UUID.randomUUID();
                admin = User.builder().roles(Set.of(Role.builder().name("ADMIN").permissions(Set.of()).build())).build();
        admin.setId(UUID.randomUUID());
    }

    @Test
    void createShouldRejectInvalidRankOrder() {
        CreateAcademicLevelRequest request = CreateAcademicLevelRequest.builder()
                .establishmentId(establishmentId)
                .code("BTS1")
                .label("BTS 1")
                .rankOrder(-1)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());

        assertThrows(IllegalArgumentException.class,
                () -> academicLevelService.create(admin.getId(), request, "corr-al-1"));
    }

    @Test
    void createShouldPersistAcademicLevel() {
        CreateAcademicLevelRequest request = CreateAcademicLevelRequest.builder()
                .establishmentId(establishmentId)
                .code("BTS1")
                .label("BTS 1")
                .rankOrder(1)
                .build();

        AcademicLevel saved = AcademicLevel.builder()
                .id(UUID.randomUUID())
                .establishmentId(establishmentId)
                .code("BTS1")
                .label("BTS 1")
                .rankOrder(1)
                .active(true)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(establishmentJpaRepository.findById(establishmentId)).thenReturn(Optional.of(
                Establishment.builder().id(establishmentId).createdByUserId(admin.getId()).code("EST").name("Est").build()
        ));
        when(academicLevelJpaRepository.existsByEstablishmentIdAndCodeIgnoreCase(establishmentId, "BTS1")).thenReturn(false);
        when(academicLevelJpaRepository.save(any(AcademicLevel.class))).thenReturn(saved);

        AcademicLevelResponse response = academicLevelService.create(admin.getId(), request, "corr-al-2");

        assertEquals("BTS1", response.getCode());
        assertEquals(1, response.getRankOrder());
    }

    @Test
    void listShouldReturnScopedAcademicLevels() {
        AcademicLevel level = AcademicLevel.builder()
                .id(UUID.randomUUID())
                .establishmentId(establishmentId)
                .code("BTS1")
                .label("BTS 1")
                .rankOrder(1)
                .active(true)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(establishmentJpaRepository.findById(establishmentId)).thenReturn(Optional.of(
                Establishment.builder().id(establishmentId).createdByUserId(admin.getId()).code("EST").name("Est").build()
        ));
        when(academicLevelJpaRepository.findAllByEstablishmentId(any(UUID.class), any(org.springframework.data.domain.Sort.class)))
                .thenReturn(List.of(level));

        List<AcademicLevelResponse> response = academicLevelService.list(admin.getId(), establishmentId, "corr-al-3");

        assertEquals(1, response.size());
    }

    @Test
    void updateShouldChangeLabelAndRankOrder() {
        UUID levelId = UUID.randomUUID();
        AcademicLevel level = AcademicLevel.builder()
                .id(levelId)
                .establishmentId(establishmentId)
                .code("BTS1")
                .label("Old")
                .rankOrder(1)
                .active(true)
                .build();

        UpdateAcademicLevelRequest request = UpdateAcademicLevelRequest.builder()
                .label("New")
                .rankOrder(2)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(establishmentJpaRepository.findById(establishmentId)).thenReturn(Optional.of(
                Establishment.builder().id(establishmentId).createdByUserId(admin.getId()).code("EST").name("Est").build()
        ));
        when(academicLevelJpaRepository.findByIdAndEstablishmentId(levelId, establishmentId)).thenReturn(Optional.of(level));
        when(academicLevelJpaRepository.save(any(AcademicLevel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AcademicLevelResponse response = academicLevelService.update(admin.getId(), establishmentId, levelId, request, "corr-al-4");

        assertEquals("New", response.getLabel());
        assertEquals(2, response.getRankOrder());
    }
}
