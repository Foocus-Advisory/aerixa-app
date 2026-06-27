package com.aerixa.app.application.candidates.service;

import com.aerixa.app.application.auth.dto.PagedResponse;
import com.aerixa.app.application.candidates.dto.CandidateResponse;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.EstablishmentAccessGuard;
import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.candidates.entity.Candidate;
import com.aerixa.app.domain.candidates.entity.CandidateStatus;
import com.aerixa.app.infrastructure.auth.repository.OperatorEstablishmentAssignmentJpaRepository;
import com.aerixa.app.infrastructure.candidates.repository.CandidateJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.AcademicLevelJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.AcquisitionChannelJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.EntryDiplomaJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CandidateServiceListPagedTest {

    @Mock
    private CandidateJpaRepository candidateJpaRepository;

    @Mock
    private EstablishmentJpaRepository establishmentJpaRepository;

    @Mock
    private AcquisitionChannelJpaRepository acquisitionChannelJpaRepository;

    @Mock
    private EntryDiplomaJpaRepository entryDiplomaJpaRepository;

    @Mock
    private ProgramTrackLevelJpaRepository programTrackLevelJpaRepository;

    @Mock
    private AcademicLevelJpaRepository academicLevelJpaRepository;

    @Mock
    private ProgramTrackJpaRepository programTrackJpaRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ConfigurationPermissionGuard permissionGuard;

    @Mock
    private ConfigurationAuditPublisher auditPublisher;

    @Mock
    private EstablishmentAccessGuard establishmentAccessGuard;

    @Mock
    private OperatorEstablishmentAssignmentJpaRepository operatorEstablishmentAssignmentJpaRepository;

    @InjectMocks
    private CandidateService candidateService;

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
    void listPagedShouldReturnPagedResponseForAdmin() {
        User admin = userWithRole("ADMIN");
        Candidate candidate = Candidate.builder()
                .id(UUID.randomUUID())
                .establishmentId(establishmentId)
                .firstName("Jean")
                .lastName("Dupont")
                .candidatePhone("+237600000000")
                .status(CandidateStatus.ACTIVE)
                .preferredWhatsappTarget(com.aerixa.app.domain.candidates.entity.WhatsappTarget.CANDIDATE)
                .build();

        Pageable pageable = PageRequest.of(0, 20);
        Page<Candidate> page = new PageImpl<>(List.of(candidate), pageable, 1);

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(candidateJpaRepository.searchAllByEstablishmentId(eq(establishmentId), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(page);

        PagedResponse<CandidateResponse> response = candidateService.listPaged(
                admin.getId(), establishmentId, 0, 20, "createdAt", "desc", null, null, "corr-1");

        assertEquals(1, response.getContent().size());
        assertEquals(1, response.getTotalElements());
        assertEquals(0, response.getPage());
        verify(candidateJpaRepository).searchAllByEstablishmentId(eq(establishmentId), isNull(), isNull(), any(Pageable.class));
    }

    @Test
    void listPagedShouldUseOwnershipScopedQueryForOperator() {
        User operator = userWithRole("OPERATOR");

        Pageable pageable = PageRequest.of(0, 20);
        Page<Candidate> page = new PageImpl<>(List.of(), pageable, 0);

        when(userRepository.findById(operator.getId())).thenReturn(Optional.of(operator));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(candidateJpaRepository.searchVisibleToOperator(eq(establishmentId), eq(operator.getId()), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(page);

        PagedResponse<CandidateResponse> response = candidateService.listPaged(
                operator.getId(), establishmentId, 0, 20, "createdAt", "desc", null, null, "corr-2");

        assertEquals(0, response.getTotalElements());
        verify(candidateJpaRepository).searchVisibleToOperator(eq(establishmentId), eq(operator.getId()), isNull(), isNull(), any(Pageable.class));
        verify(candidateJpaRepository, org.mockito.Mockito.never())
                .searchAllByEstablishmentId(any(UUID.class), any(), any(), any(Pageable.class));
    }

    @Test
    void listPagedShouldRejectInvalidStatus() {
        User admin = userWithRole("ADMIN");

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());

        assertThrows(IllegalArgumentException.class,
                () -> candidateService.listPaged(admin.getId(), establishmentId, 0, 20, "createdAt", "desc", null, "NOT_A_STATUS", "corr-3"));
    }

    @Test
    void listPagedShouldFallBackToDefaultSortFieldWhenInvalid() {
        User admin = userWithRole("ADMIN");
        Pageable pageable = PageRequest.of(0, 20);
        Page<Candidate> page = new PageImpl<>(List.of(), pageable, 0);

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(candidateJpaRepository.searchAllByEstablishmentId(eq(establishmentId), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(page);

        candidateService.listPaged(admin.getId(), establishmentId, 0, 20, "totallyInvalidField", "desc", null, null, "corr-4");

        verify(candidateJpaRepository).searchAllByEstablishmentId(eq(establishmentId), isNull(), isNull(), argThatSortsBy("createdAt"));
    }

    private Pageable argThatSortsBy(String field) {
        return org.mockito.ArgumentMatchers.argThat(p -> p != null && p.getSort().stream()
                .anyMatch(order -> order.getProperty().equals(field)));
    }
}
