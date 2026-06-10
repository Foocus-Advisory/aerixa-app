package com.aerixa.app.application.configuration.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.dto.CreateEntryDiplomaRequest;
import com.aerixa.app.application.configuration.dto.EntryDiplomaResponse;
import com.aerixa.app.application.configuration.dto.UpdateEntryDiplomaRequest;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.EstablishmentScopeGuard;
import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.configuration.entity.EntryDiploma;
import com.aerixa.app.infrastructure.configuration.repository.EntryDiplomaJpaRepository;
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
class EntryDiplomaServiceTest {

    @Mock
    private EntryDiplomaJpaRepository entryDiplomaJpaRepository;

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
    private EntryDiplomaService entryDiplomaService;

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
        CreateEntryDiplomaRequest request = CreateEntryDiplomaRequest.builder()
                .establishmentId(establishmentId)
                .code("BAC")
                .label("Baccalaureat")
                .rankOrder(0)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());

        assertThrows(IllegalArgumentException.class,
                () -> entryDiplomaService.create(admin.getId(), request, "corr-ed-1"));
    }

    @Test
    void createShouldPersistEntryDiploma() {
        CreateEntryDiplomaRequest request = CreateEntryDiplomaRequest.builder()
                .establishmentId(establishmentId)
                .code("BAC")
                .label("Baccalaureat")
                .rankOrder(1)
                .build();

        EntryDiploma saved = EntryDiploma.builder()
                .id(UUID.randomUUID())
                .establishmentId(establishmentId)
                .code("BAC")
                .label("Baccalaureat")
                .rankOrder(1)
                .active(true)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(establishmentJpaRepository.findById(establishmentId)).thenReturn(Optional.of(
                Establishment.builder().id(establishmentId).createdByUserId(admin.getId()).code("EST").name("Est").build()
        ));
        when(entryDiplomaJpaRepository.existsByEstablishmentIdAndCodeIgnoreCase(establishmentId, "BAC")).thenReturn(false);
        when(entryDiplomaJpaRepository.save(any(EntryDiploma.class))).thenReturn(saved);

        EntryDiplomaResponse response = entryDiplomaService.create(admin.getId(), request, "corr-ed-2");

        assertEquals("BAC", response.getCode());
        assertEquals(1, response.getRankOrder());
    }

    @Test
    void listShouldReturnScopedDiplomas() {
        EntryDiploma diploma = EntryDiploma.builder()
                .id(UUID.randomUUID())
                .establishmentId(establishmentId)
                .code("BAC")
                .label("Baccalaureat")
                .rankOrder(1)
                .active(true)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(establishmentJpaRepository.findById(establishmentId)).thenReturn(Optional.of(
                Establishment.builder().id(establishmentId).createdByUserId(admin.getId()).code("EST").name("Est").build()
        ));
        when(entryDiplomaJpaRepository.findAllByEstablishmentId(any(UUID.class), any(org.springframework.data.domain.Sort.class)))
                .thenReturn(List.of(diploma));

        List<EntryDiplomaResponse> response = entryDiplomaService.list(admin.getId(), establishmentId, "corr-ed-3");

        assertEquals(1, response.size());
    }

    @Test
    void updateShouldChangeLabelAndRankOrder() {
        UUID diplomaId = UUID.randomUUID();
        EntryDiploma diploma = EntryDiploma.builder()
                .id(diplomaId)
                .establishmentId(establishmentId)
                .code("BAC")
                .label("Old")
                .rankOrder(1)
                .active(true)
                .build();

        UpdateEntryDiplomaRequest request = UpdateEntryDiplomaRequest.builder()
                .label("New")
                .rankOrder(2)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(establishmentJpaRepository.findById(establishmentId)).thenReturn(Optional.of(
                Establishment.builder().id(establishmentId).createdByUserId(admin.getId()).code("EST").name("Est").build()
        ));
        when(entryDiplomaJpaRepository.findByIdAndEstablishmentId(diplomaId, establishmentId)).thenReturn(Optional.of(diploma));
        when(entryDiplomaJpaRepository.save(any(EntryDiploma.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EntryDiplomaResponse response = entryDiplomaService.update(admin.getId(), establishmentId, diplomaId, request, "corr-ed-4");

        assertEquals("New", response.getLabel());
        assertEquals(2, response.getRankOrder());
    }
}
