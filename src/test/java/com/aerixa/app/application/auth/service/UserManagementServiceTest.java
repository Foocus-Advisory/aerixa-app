package com.aerixa.app.application.auth.service;

import com.aerixa.app.application.auth.dto.CreateUserRequest;
import com.aerixa.app.application.auth.dto.UserResponse;
import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import com.aerixa.app.domain.auth.repository.RoleRepository;
import com.aerixa.app.domain.auth.repository.SessionRepository;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.infrastructure.auth.repository.UserJpaRepository;
import com.aerixa.app.infrastructure.notification.PasswordResetMailQueueService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserManagementServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private UserJpaRepository userJpaRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private SessionRepository sessionRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private PasswordResetMailQueueService passwordResetMailQueueService;

    @InjectMocks
    private UserManagementService userManagementService;

    private User adminActor;
    private Role operatorRole;

    @BeforeEach
    void setUp() {
        Role adminRole = Role.builder().name("ADMIN").level(1).build();
        operatorRole = Role.builder().name("OPERATOR").level(2).build();

        adminActor = User.builder()
                .email("admin@aerixa.com")
                .roles(Set.of(adminRole))
                .build();
        adminActor.setId(UUID.randomUUID());
    }

    @Test
    void createUserShouldDefaultToOperatorRoleWhenRolesMissing() {
        CreateUserRequest request = CreateUserRequest.builder()
                .email("new@aerixa.com")
                .password("Password123A")
                .firstName("New")
                .lastName("User")
                .build();

        when(userRepository.findById(any(UUID.class))).thenReturn(Optional.of(adminActor));
        when(roleRepository.findByName("OPERATOR")).thenReturn(Optional.of(operatorRole));
        when(passwordEncoder.encode("Password123A")).thenReturn("encoded");
        when(passwordResetMailQueueService.enqueueInitialPasswordInvitationMail("new@aerixa.com"))
                .thenReturn(PasswordResetMailQueueService.MailQueueResult.builder()
                        .accepted(true)
                        .queued(true)
                        .jobId("job-1")
                        .recipient("new@aerixa.com")
                        .fallbackRecipient(null)
                        .build());
                when(userRepository.save(any(User.class))).thenAnswer(inv -> {
                        User user = inv.getArgument(0);
                        user.setId(UUID.randomUUID());
                        return user;
                });

        UserResponse response = userManagementService.createUser(request, adminActor.getId());

        assertEquals("new@aerixa.com", response.getEmail());
        assertTrue(response.getRoles().contains("OPERATOR"));
        assertTrue(response.isMustChangePassword());
    }

    @Test
    void toggleStatusShouldDenyWhenActorTriesToManageHigherRole() {
        User superAdminTarget = User.builder()
                .roles(Set.of(Role.builder().name("SUPER_ADMIN").level(0).build()))
                .status(User.UserStatus.ACTIVE)
                .build();
        superAdminTarget.setId(UUID.randomUUID());

        when(userRepository.findById(any(UUID.class)))
                .thenReturn(Optional.of(adminActor), Optional.of(superAdminTarget));
        lenient().when(((UserRepository) userJpaRepository).findById(any(UUID.class)))
                .thenReturn(Optional.of(adminActor), Optional.of(superAdminTarget));

        assertThrows(PermissionDeniedException.class,
                () -> userManagementService.toggleStatus(adminActor.getId(), superAdminTarget.getId()));
    }
}
