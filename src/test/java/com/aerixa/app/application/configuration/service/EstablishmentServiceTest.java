package com.aerixa.app.application.configuration.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.dto.CreateEstablishmentRequest;
import com.aerixa.app.application.configuration.dto.EstablishmentResponse;
import com.aerixa.app.application.configuration.dto.UpdateEstablishmentRequest;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.domain.auth.repository.UserRepository;
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
class EstablishmentServiceTest {

    @Mock
        private EstablishmentJpaRepository establishmentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ConfigurationPermissionGuard permissionGuard;

    @Mock
    private ConfigurationAuditPublisher auditPublisher;

    @InjectMocks
    private EstablishmentService establishmentService;

    private User admin;
    private User superAdmin;

    @BeforeEach
    void setUp() {
        admin = User.builder().roles(Set.of(Role.builder().name("ADMIN").build())).build();
        admin.setId(UUID.randomUUID());

        superAdmin = User.builder().roles(Set.of(Role.builder().name("SUPER_ADMIN").build())).build();
        superAdmin.setId(UUID.randomUUID());
    }

    @Test
    void adminCannotCreateSecondEstablishment() {
        CreateEstablishmentRequest request = CreateEstablishmentRequest.builder()
                .code("est-001")
                .name("Etablissement 1")
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(establishmentRepository.existsByCode("est-001")).thenReturn(false);
        when(establishmentRepository.existsByCreatedByUserId(admin.getId())).thenReturn(true);

        assertThrows(PermissionDeniedException.class,
                () -> establishmentService.createEstablishment(admin.getId(), request, "corr-1"));
    }

    @Test
    void adminCanOnlyReadOwnEstablishment() {
        UUID establishmentId = UUID.randomUUID();

        Establishment otherAdminEstablishment = Establishment.builder()
                .id(establishmentId)
                .code("EST-A")
                .name("Autre")
                .createdByUserId(UUID.randomUUID())
                .status(Establishment.EstablishmentStatus.ACTIVE)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(establishmentRepository.findById(establishmentId)).thenReturn(Optional.of(otherAdminEstablishment));

        assertThrows(PermissionDeniedException.class,
                () -> establishmentService.getEstablishment(admin.getId(), establishmentId, "corr-2"));
    }

    @Test
    void superAdminCanListAllEstablishments() {
        Establishment first = Establishment.builder()
                .id(UUID.randomUUID())
                .code("EST-1")
                .name("One")
                .createdByUserId(admin.getId())
                .status(Establishment.EstablishmentStatus.ACTIVE)
                .build();
        Establishment second = Establishment.builder()
                .id(UUID.randomUUID())
                .code("EST-2")
                .name("Two")
                .createdByUserId(UUID.randomUUID())
                .status(Establishment.EstablishmentStatus.ACTIVE)
                .build();

        when(userRepository.findById(superAdmin.getId())).thenReturn(Optional.of(superAdmin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(establishmentRepository.findAll(any(org.springframework.data.domain.Sort.class))).thenReturn(List.of(first, second));

        List<EstablishmentResponse> response = establishmentService.listEstablishments(superAdmin.getId(), "corr-3");

        assertEquals(2, response.size());
    }

    @Test
    void updateShouldApplyNameShortNameAndStatus() {
        UUID establishmentId = UUID.randomUUID();

        Establishment establishment = Establishment.builder()
                .id(establishmentId)
                .code("EST-3")
                .name("Old")
                .shortName("O")
                .createdByUserId(admin.getId())
                .status(Establishment.EstablishmentStatus.ACTIVE)
                .build();

        UpdateEstablishmentRequest request = UpdateEstablishmentRequest.builder()
                .name("New Name")
                .shortName("NN")
                .status("inactive")
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(establishmentRepository.findById(establishmentId)).thenReturn(Optional.of(establishment));
        when(establishmentRepository.save(any(Establishment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EstablishmentResponse updated = establishmentService.updateEstablishment(admin.getId(), establishmentId, request, "corr-4");

        assertEquals("New Name", updated.getName());
        assertEquals("NN", updated.getShortName());
        assertEquals("INACTIVE", updated.getStatus());
    }

        @Test
        void activateShouldSetStatusActive() {
                UUID establishmentId = UUID.randomUUID();
                Establishment establishment = Establishment.builder()
                                .id(establishmentId)
                                .code("EST-4")
                                .name("Dormant")
                                .createdByUserId(admin.getId())
                                .status(Establishment.EstablishmentStatus.INACTIVE)
                                .build();

                when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
                doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
                when(establishmentRepository.findById(establishmentId)).thenReturn(Optional.of(establishment));
                when(establishmentRepository.save(any(Establishment.class))).thenAnswer(invocation -> invocation.getArgument(0));

                EstablishmentResponse response = establishmentService.activateEstablishment(admin.getId(), establishmentId, "corr-5");

                assertEquals("ACTIVE", response.getStatus());
        }

        @Test
        void deactivateShouldSetStatusInactive() {
                UUID establishmentId = UUID.randomUUID();
                Establishment establishment = Establishment.builder()
                                .id(establishmentId)
                                .code("EST-5")
                                .name("Active")
                                .createdByUserId(admin.getId())
                                .status(Establishment.EstablishmentStatus.ACTIVE)
                                .build();

                when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
                doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
                when(establishmentRepository.findById(establishmentId)).thenReturn(Optional.of(establishment));
                when(establishmentRepository.save(any(Establishment.class))).thenAnswer(invocation -> invocation.getArgument(0));

                EstablishmentResponse response = establishmentService.deactivateEstablishment(admin.getId(), establishmentId, "corr-6");

                assertEquals("INACTIVE", response.getStatus());
        }
}
