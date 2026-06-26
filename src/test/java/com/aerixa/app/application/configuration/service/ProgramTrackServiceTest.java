package com.aerixa.app.application.configuration.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.dto.CreateProgramTrackRequest;
import com.aerixa.app.application.configuration.dto.ProgramTrackResponse;
import com.aerixa.app.application.configuration.dto.UpdateProgramTrackRequest;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.EstablishmentAccessGuard;
import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.configuration.entity.ProgramTrack;
import com.aerixa.app.infrastructure.configuration.repository.ProgramTrackJpaRepository;
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
class ProgramTrackServiceTest {

    @Mock
    private ProgramTrackJpaRepository programTrackJpaRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ConfigurationPermissionGuard permissionGuard;

    @Mock
    private EstablishmentAccessGuard establishmentAccessGuard;

    @Mock
    private ConfigurationAuditPublisher auditPublisher;

    @InjectMocks
    private ProgramTrackService service;

    private User admin;
    private UUID establishmentId;

    @BeforeEach
    void setUp() {
        establishmentId = UUID.randomUUID();
        admin = User.builder().roles(Set.of(Role.builder().name("ADMIN").permissions(Set.of()).build())).build();
        admin.setId(UUID.randomUUID());
    }

    @Test
    void createShouldRejectMissingName() {
        CreateProgramTrackRequest request = CreateProgramTrackRequest.builder()
                .establishmentId(establishmentId)
                .code("GL")
                .name(" ")
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());

        assertThrows(IllegalArgumentException.class,
                () -> service.create(admin.getId(), request, "corr-pt-1"));
    }

    @Test
    void createShouldPersistProgramTrack() {
        CreateProgramTrackRequest request = CreateProgramTrackRequest.builder()
                .establishmentId(establishmentId)
                .code("gl")
                .name("Genie Logiciel")
                .description("Formation GL")
                .build();

        ProgramTrack saved = ProgramTrack.builder()
                .id(UUID.randomUUID())
                .establishmentId(establishmentId)
                .code("GL")
                .name("Genie Logiciel")
                .description("Formation GL")
                .active(true)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(programTrackJpaRepository.existsByEstablishmentIdAndCodeIgnoreCase(establishmentId, "GL")).thenReturn(false);
        when(programTrackJpaRepository.save(any(ProgramTrack.class))).thenReturn(saved);

        ProgramTrackResponse response = service.create(admin.getId(), request, "corr-pt-2");

        assertEquals("GL", response.getCode());
        assertEquals("Genie Logiciel", response.getName());
    }

    @Test
    void listShouldReturnScopedProgramTracks() {
        ProgramTrack track = ProgramTrack.builder()
                .id(UUID.randomUUID())
                .establishmentId(establishmentId)
                .code("GL")
                .name("Genie Logiciel")
                .active(true)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(programTrackJpaRepository.findAllByEstablishmentId(any(UUID.class), any(org.springframework.data.domain.Sort.class)))
                .thenReturn(List.of(track));

        List<ProgramTrackResponse> response = service.list(admin.getId(), establishmentId, "corr-pt-3");

        assertEquals(1, response.size());
    }

    @Test
    void updateShouldChangeNameAndDescription() {
        UUID id = UUID.randomUUID();
        ProgramTrack track = ProgramTrack.builder()
                .id(id)
                .establishmentId(establishmentId)
                .code("GL")
                .name("Old")
                .description("Old Desc")
                .active(true)
                .build();

        UpdateProgramTrackRequest request = UpdateProgramTrackRequest.builder()
                .name("New")
                .description("New Desc")
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(programTrackJpaRepository.findByIdAndEstablishmentId(id, establishmentId)).thenReturn(Optional.of(track));
        when(programTrackJpaRepository.save(any(ProgramTrack.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProgramTrackResponse response = service.update(admin.getId(), establishmentId, id, request, "corr-pt-4");

        assertEquals("New", response.getName());
        assertEquals("New Desc", response.getDescription());
    }
}
