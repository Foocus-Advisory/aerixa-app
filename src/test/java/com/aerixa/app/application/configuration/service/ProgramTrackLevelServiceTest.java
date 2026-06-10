package com.aerixa.app.application.configuration.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.dto.CreateProgramTrackLevelRequest;
import com.aerixa.app.application.configuration.dto.ProgramTrackLevelResponse;
import com.aerixa.app.application.configuration.dto.UpdateProgramTrackLevelRequest;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.configuration.entity.AcademicLevel;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.domain.configuration.entity.ProgramTrack;
import com.aerixa.app.domain.configuration.entity.ProgramTrackLevel;
import com.aerixa.app.infrastructure.configuration.repository.AcademicLevelJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.ProgramTrackJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.ProgramTrackLevelJpaRepository;
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
class ProgramTrackLevelServiceTest {

    @Mock
    private ProgramTrackLevelJpaRepository programTrackLevelJpaRepository;

    @Mock
    private ProgramTrackJpaRepository programTrackJpaRepository;

    @Mock
    private AcademicLevelJpaRepository academicLevelJpaRepository;

    @Mock
    private EstablishmentJpaRepository establishmentJpaRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ConfigurationPermissionGuard permissionGuard;

    @Mock
    private ConfigurationAuditPublisher auditPublisher;

    @InjectMocks
    private ProgramTrackLevelService service;

    private User admin;
    private UUID establishmentId;

    @BeforeEach
    void setUp() {
        establishmentId = UUID.randomUUID();
        admin = User.builder().roles(Set.of(Role.builder().name("ADMIN").permissions(Set.of()).build())).build();
        admin.setId(UUID.randomUUID());
    }

    @Test
    void createShouldRejectMissingAcademicLevel() {
        CreateProgramTrackLevelRequest request = CreateProgramTrackLevelRequest.builder()
                .establishmentId(establishmentId)
                .programTrackId(UUID.randomUUID())
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());

        assertThrows(IllegalArgumentException.class,
                () -> service.create(admin.getId(), request, "corr-ptl-1"));
    }

    @Test
    void createShouldRejectCrossEstablishmentAssociation() {
        UUID trackId = UUID.randomUUID();
        UUID levelId = UUID.randomUUID();

        CreateProgramTrackLevelRequest request = CreateProgramTrackLevelRequest.builder()
                .establishmentId(establishmentId)
                .programTrackId(trackId)
                .academicLevelId(levelId)
                .build();

        ProgramTrack track = ProgramTrack.builder()
                .id(trackId)
                .establishmentId(establishmentId)
                .code("GL")
                .name("Genie Logiciel")
                .active(true)
                .build();

        AcademicLevel level = AcademicLevel.builder()
                .id(levelId)
                .establishmentId(UUID.randomUUID())
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
        when(programTrackJpaRepository.findById(trackId)).thenReturn(Optional.of(track));
        when(academicLevelJpaRepository.findById(levelId)).thenReturn(Optional.of(level));

        assertThrows(IllegalArgumentException.class,
                () -> service.create(admin.getId(), request, "corr-ptl-2"));
    }

    @Test
    void createShouldPersistMapping() {
        UUID trackId = UUID.randomUUID();
        UUID levelId = UUID.randomUUID();

        CreateProgramTrackLevelRequest request = CreateProgramTrackLevelRequest.builder()
                .establishmentId(establishmentId)
                .programTrackId(trackId)
                .academicLevelId(levelId)
                .build();

        ProgramTrack track = ProgramTrack.builder()
                .id(trackId)
                .establishmentId(establishmentId)
                .code("GL")
                .name("Genie Logiciel")
                .active(true)
                .build();

        AcademicLevel level = AcademicLevel.builder()
                .id(levelId)
                .establishmentId(establishmentId)
                .code("BTS1")
                .label("BTS 1")
                .rankOrder(1)
                .active(true)
                .build();

        ProgramTrackLevel saved = ProgramTrackLevel.builder()
                .id(UUID.randomUUID())
                .establishmentId(establishmentId)
                .programTrackId(trackId)
                .academicLevelId(levelId)
                .openForApplication(true)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(establishmentJpaRepository.findById(establishmentId)).thenReturn(Optional.of(
                Establishment.builder().id(establishmentId).createdByUserId(admin.getId()).code("EST").name("Est").build()
        ));
        when(programTrackJpaRepository.findById(trackId)).thenReturn(Optional.of(track));
        when(academicLevelJpaRepository.findById(levelId)).thenReturn(Optional.of(level));
        when(programTrackLevelJpaRepository.existsByEstablishmentIdAndProgramTrackIdAndAcademicLevelId(establishmentId, trackId, levelId))
                .thenReturn(false);
        when(programTrackLevelJpaRepository.save(any(ProgramTrackLevel.class))).thenReturn(saved);

        ProgramTrackLevelResponse response = service.create(admin.getId(), request, "corr-ptl-3");

        assertEquals(trackId, response.getProgramTrackId());
        assertEquals(levelId, response.getAcademicLevelId());
    }

    @Test
    void updateShouldChangeAcademicLevel() {
        UUID mappingId = UUID.randomUUID();
        UUID trackId = UUID.randomUUID();
        UUID oldLevelId = UUID.randomUUID();
        UUID newLevelId = UUID.randomUUID();

        ProgramTrackLevel item = ProgramTrackLevel.builder()
                .id(mappingId)
                .establishmentId(establishmentId)
                .programTrackId(trackId)
                .academicLevelId(oldLevelId)
                .openForApplication(true)
                .build();

        ProgramTrack track = ProgramTrack.builder()
                .id(trackId)
                .establishmentId(establishmentId)
                .code("GL")
                .name("Genie Logiciel")
                .active(true)
                .build();

        AcademicLevel newLevel = AcademicLevel.builder()
                .id(newLevelId)
                .establishmentId(establishmentId)
                .code("BTS2")
                .label("BTS 2")
                .rankOrder(2)
                .active(true)
                .build();

        UpdateProgramTrackLevelRequest request = UpdateProgramTrackLevelRequest.builder()
                .academicLevelId(newLevelId)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(establishmentJpaRepository.findById(establishmentId)).thenReturn(Optional.of(
                Establishment.builder().id(establishmentId).createdByUserId(admin.getId()).code("EST").name("Est").build()
        ));
        when(programTrackLevelJpaRepository.findByIdAndEstablishmentId(mappingId, establishmentId)).thenReturn(Optional.of(item));
        when(academicLevelJpaRepository.findById(newLevelId)).thenReturn(Optional.of(newLevel));
        when(programTrackJpaRepository.findById(trackId)).thenReturn(Optional.of(track));
        when(programTrackLevelJpaRepository.existsByEstablishmentIdAndProgramTrackIdAndAcademicLevelIdAndIdNot(
                establishmentId, trackId, newLevelId, mappingId)).thenReturn(false);
        when(programTrackLevelJpaRepository.save(any(ProgramTrackLevel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProgramTrackLevelResponse response = service.update(admin.getId(), establishmentId, mappingId, request, "corr-ptl-4");

        assertEquals(newLevelId, response.getAcademicLevelId());
    }
}
