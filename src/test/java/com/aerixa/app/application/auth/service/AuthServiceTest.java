package com.aerixa.app.application.auth.service;

import com.aerixa.app.application.auth.dto.LoginRequest;
import com.aerixa.app.application.auth.dto.LoginResponse;
import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.entity.Session;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.InvalidCredentialsException;
import com.aerixa.app.domain.auth.exception.SessionConflictException;
import com.aerixa.app.domain.auth.repository.RoleRepository;
import com.aerixa.app.domain.auth.repository.SessionRepository;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.infrastructure.security.JwtTokenProvider;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private SessionRepository sessionRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtTokenProvider jwtTokenProvider;
    @Mock
    private SessionService sessionService;

    @InjectMocks
    private AuthService authService;

    private User activeUser;

    @BeforeEach
    void setUp() {
        Role role = Role.builder().id(UUID.randomUUID()).name("ADMIN").level(1).build();
        activeUser = User.builder()
                .id(UUID.randomUUID())
                .email("admin@aerixa.com")
                .passwordHash("hashed")
                .status(User.UserStatus.ACTIVE)
                .emailVerified(true)
                .roles(Set.of(role))
                .build();
    }

    @Test
    void loginShouldReturnTokensWhenCredentialsAreValid() {
        LoginRequest request = LoginRequest.builder()
                .email(activeUser.getEmail())
                .password("Password123A")
                .build();

        when(userRepository.findByEmail(activeUser.getEmail())).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("Password123A", "hashed")).thenReturn(true);
        when(sessionRepository.findActiveSessionByUserId(activeUser.getId())).thenReturn(Optional.empty());
        when(jwtTokenProvider.generateAccessToken(activeUser)).thenReturn("access-token");
        when(jwtTokenProvider.generateRefreshToken(activeUser)).thenReturn("refresh-token");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        LoginResponse response = authService.login(request, "127.0.0.1", "JUnit", "Test Device", "DESKTOP");

        assertEquals("access-token", response.getAccessToken());
        assertEquals("refresh-token", response.getRefreshToken());
        assertEquals(activeUser.getEmail(), response.getUser().getEmail());
        verify(sessionService, times(1)).createSession(any(Session.class));
    }

        @Test
        void loginShouldReplaceExistingSessionWhenSameBrowser() {
                LoginRequest request = LoginRequest.builder()
                                .email(activeUser.getEmail())
                                .password("Password123A")
                                .build();

                Session existingSession = Session.builder()
                                .id(UUID.randomUUID())
                                .deviceName("browser-123")
                                .deviceType(Session.DeviceType.DESKTOP)
                                .userAgent("JUnit")
                                .build();

                when(userRepository.findByEmail(activeUser.getEmail())).thenReturn(Optional.of(activeUser));
                when(passwordEncoder.matches("Password123A", "hashed")).thenReturn(true);
                when(sessionRepository.findActiveSessionByUserId(activeUser.getId())).thenReturn(Optional.of(existingSession));
                when(jwtTokenProvider.generateAccessToken(activeUser)).thenReturn("access-token");
                when(jwtTokenProvider.generateRefreshToken(activeUser)).thenReturn("refresh-token");
                when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

                LoginResponse response = authService.login(request, "127.0.0.1", "JUnit", "browser-123", "DESKTOP");

                assertEquals("access-token", response.getAccessToken());
                verify(sessionRepository, times(1)).save(existingSession);
                verify(sessionService, times(1)).createSession(any(Session.class));
        }

    @Test
    void loginShouldThrowWhenPasswordIsInvalid() {
        LoginRequest request = LoginRequest.builder()
                .email(activeUser.getEmail())
                .password("wrong")
                .build();

        when(userRepository.findByEmail(activeUser.getEmail())).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

        assertThrows(InvalidCredentialsException.class,
                () -> authService.login(request, "127.0.0.1", "JUnit", "Test Device", "DESKTOP"));
    }

    @Test
    void loginShouldThrowWhenSessionAlreadyActive() {
        LoginRequest request = LoginRequest.builder()
                .email(activeUser.getEmail())
                .password("Password123A")
                .build();

        Session existingSession = Session.builder()
                .id(UUID.randomUUID())
                .deviceName("Laptop")
                .deviceType(Session.DeviceType.DESKTOP)
                .userAgent("Different Browser")
                .build();

        when(userRepository.findByEmail(activeUser.getEmail())).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("Password123A", "hashed")).thenReturn(true);
        when(sessionRepository.findActiveSessionByUserId(activeUser.getId())).thenReturn(Optional.of(existingSession));

        assertThrows(SessionConflictException.class,
                () -> authService.login(request, "127.0.0.1", "JUnit", "Test Device", "DESKTOP"));
    }
}
