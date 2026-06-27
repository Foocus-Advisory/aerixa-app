package com.aerixa.app.application.candidates.service;

import com.aerixa.app.application.auth.dto.PagedResponse;
import com.aerixa.app.application.candidates.dto.CandidateApplicationResponse;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.EstablishmentAccessGuard;
import com.aerixa.app.application.notification.service.NotificationJobService;
import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.candidates.entity.CandidateApplication;
import com.aerixa.app.domain.candidates.entity.CandidateApplicationStatus;
import com.aerixa.app.infrastructure.auth.repository.UserJpaRepository;
import com.aerixa.app.infrastructure.candidates.repository.CandidateApplicationJpaRepository;
import com.aerixa.app.infrastructure.candidates.repository.CandidateApplicationStageHistoryJpaRepository;
import com.aerixa.app.infrastructure.candidates.repository.CandidateJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.AcademicLevelJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.EntryDiplomaJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.FunnelStageJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.FunnelStageTransitionJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.ProgramTrackJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.ProgramTrackLevelJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CandidateApplicationServiceListPagedTest {

    @Mock
    private CandidateApplicationJpaRepository candidateApplicationJpaRepository;

    @Mock
    private CandidateApplicationStageHistoryJpaRepository stageHistoryJpaRepository;

    @Mock
    private CandidateJpaRepository candidateJpaRepository;

    @Mock
    private EstablishmentJpaRepository establishmentJpaRepository;

    @Mock
    private ProgramTrackLevelJpaRepository programTrackLevelJpaRepository;

    @Mock
    private AcademicLevelJpaRepository academicLevelJpaRepository;

    @Mock
    private EntryDiplomaJpaRepository entryDiplomaJpaRepository;

    @Mock
    private ProgramTrackJpaRepository programTrackJpaRepository;

    @Mock
    private FunnelStageJpaRepository funnelStageJpaRepository;

    @Mock
    private FunnelStageTransitionJpaRepository funnelStageTransitionJpaRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserJpaRepository userJpaRepository;

    @Mock
    private CandidateNoteService candidateNoteService;

    @Mock
    private ConfigurationPermissionGuard permissionGuard;

    @Mock
    private ConfigurationAuditPublisher auditPublisher;

    @Mock
    private NotificationJobService notificationJobService;

    @Mock
    private EstablishmentAccessGuard establishmentAccessGuard;

    @InjectMocks
    private CandidateApplicationService candidateApplicationService;

    private UUID establishmentId;

    @BeforeEach
    void setUp() {
        establishmentId = UUID.randomUUID();
    }

    private User userWithRole(String roleName) {
        User user = User.builder().roles(Set.of(Role.builder().name(roleName).permissions(Set.of()).build())).build();
        user.setId(UUID.randomUUID());
        return user;
    }

    @Test
    void listByEstablishmentShouldReturnPagedResponseForAdmin() {
        User admin = userWithRole("ADMIN");
        CandidateApplication application = CandidateApplication.builder()
                .id(UUID.randomUUID())
                .establishmentId(establishmentId)
                .candidateId(UUID.randomUUID())
                .status(CandidateApplicationStatus.IN_PROGRESS)
                .build();

        Pageable pageable = PageRequest.of(0, 20);
        Page<CandidateApplication> page = new PageImpl<>(List.of(application), pageable, 1);

        lenient().when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        lenient().when(((UserRepository) userJpaRepository).findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(candidateApplicationJpaRepository.searchAllByEstablishmentId(eq(establishmentId), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(page);

        PagedResponse<CandidateApplicationResponse> response = candidateApplicationService.listByEstablishment(
                admin.getId(), establishmentId, 0, 20, "createdAt", "desc", null, null, "corr-1");

        assertEquals(1, response.getContent().size());
        assertEquals(1, response.getTotalElements());
        verify(candidateApplicationJpaRepository).searchAllByEstablishmentId(eq(establishmentId), isNull(), isNull(), any(Pageable.class));
    }

    @Test
    void listByEstablishmentShouldUseOwnershipScopedQueryForOperator() {
        User operator = userWithRole("OPERATOR");

        Pageable pageable = PageRequest.of(0, 20);
        Page<CandidateApplication> page = new PageImpl<>(List.of(), pageable, 0);

        lenient().when(userRepository.findById(operator.getId())).thenReturn(Optional.of(operator));
        lenient().when(((UserRepository) userJpaRepository).findById(operator.getId())).thenReturn(Optional.of(operator));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(candidateApplicationJpaRepository.searchVisibleToOperatorByEstablishment(
                eq(establishmentId), eq(operator.getId()), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(page);

        PagedResponse<CandidateApplicationResponse> response = candidateApplicationService.listByEstablishment(
                operator.getId(), establishmentId, 0, 20, "createdAt", "desc", null, null, "corr-2");

        assertEquals(0, response.getTotalElements());
        verify(candidateApplicationJpaRepository).searchVisibleToOperatorByEstablishment(
                eq(establishmentId), eq(operator.getId()), isNull(), isNull(), any(Pageable.class));
        verify(candidateApplicationJpaRepository, never())
                .searchAllByEstablishmentId(any(UUID.class), any(), any(), any(Pageable.class));
    }

    @Test
    void listByEstablishmentShouldFilterByFunnelStage() {
        User admin = userWithRole("ADMIN");
        UUID funnelStageId = UUID.randomUUID();

        Pageable pageable = PageRequest.of(0, 20);
        Page<CandidateApplication> page = new PageImpl<>(List.of(), pageable, 0);

        lenient().when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        lenient().when(((UserRepository) userJpaRepository).findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(candidateApplicationJpaRepository.searchAllByEstablishmentId(eq(establishmentId), isNull(), eq(funnelStageId), any(Pageable.class)))
                .thenReturn(page);

        candidateApplicationService.listByEstablishment(
                admin.getId(), establishmentId, 0, 20, "createdAt", "desc", null, funnelStageId, "corr-3");

        verify(candidateApplicationJpaRepository).searchAllByEstablishmentId(eq(establishmentId), isNull(), eq(funnelStageId), any(Pageable.class));
    }

    @Test
    void listByEstablishmentShouldRejectInvalidStatus() {
        User admin = userWithRole("ADMIN");

        lenient().when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        lenient().when(((UserRepository) userJpaRepository).findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());

        assertThrows(IllegalArgumentException.class,
                () -> candidateApplicationService.listByEstablishment(
                        admin.getId(), establishmentId, 0, 20, "createdAt", "desc", "NOT_A_STATUS", null, "corr-4"));
    }
}
