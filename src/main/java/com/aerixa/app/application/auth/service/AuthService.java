package com.aerixa.app.application.auth.service;

import com.aerixa.app.application.auth.dto.*;
import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.entity.Session;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.*;
import com.aerixa.app.domain.auth.repository.RoleRepository;
import com.aerixa.app.domain.auth.repository.SessionRepository;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.infrastructure.notification.PasswordResetMailQueueService;
import com.aerixa.app.infrastructure.security.JwtTokenProvider;
import com.aerixa.app.infrastructure.security.TokenHashUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final SessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final SessionService sessionService;
    private final PasswordResetMailQueueService passwordResetMailQueueService;

    @Transactional
    public LoginResponse login(LoginRequest request, String ipAddress, String userAgent, String deviceName, String deviceType) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        if (user.getStatus() == User.UserStatus.DISABLED) {
            throw new UserDisabledException(user.getEmail());
        }

        if (Boolean.FALSE.equals(user.getEmailVerified())) {
            throw new EmailNotVerifiedException(user.getEmail());
        }

        sessionRepository.findActiveSessionByUserId(user.getId()).ifPresent(existing -> {
            if (isSameBrowser(existing, deviceName, userAgent, deviceType)) {
                existing.setRevokedAt(LocalDateTime.now());
                sessionRepository.save(existing);
                return;
            }

            throw new SessionConflictException(existing.getId(),
                    existing.getDeviceName() != null ? existing.getDeviceName() : "un autre appareil");
        });

        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = jwtTokenProvider.generateRefreshToken(user);

        Session session = Session.builder()
                .user(user)
                .accessTokenHash(TokenHashUtils.sha256(accessToken))
                .refreshTokenHash(TokenHashUtils.sha256(refreshToken))
                .deviceName(deviceName)
                .deviceType(parseDeviceType(deviceType))
                .ipAddress(ipAddress != null ? ipAddress : "0.0.0.0")
                .userAgent(userAgent)
                .lastActivityAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusDays(30))
                .build();

        sessionService.createSession(session);
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .mustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()))
                .user(LoginResponse.UserResponse.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .firstName(user.getFirstName())
                        .lastName(user.getLastName())
                        .username(user.getUsername())
                        .roles(roleNames(user.getRoles()))
                        .build())
                .build();
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Un utilisateur avec cet email existe déjà");
        }

        validatePasswordPolicy(request.getPassword());

        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseThrow(() -> new IllegalStateException("Le rôle ADMIN est introuvable"));

        User user = User.builder()
                .email(request.getEmail())
                .username(request.getUsername())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phoneNumber(request.getPhoneNumber())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .status(User.UserStatus.PENDING_VERIFICATION)
                .emailVerified(false)
                .mustChangePassword(false)
                .roles(Set.of(adminRole))
                .build();

        User saved = userRepository.save(user);

        return RegisterResponse.builder()
                .id(saved.getId())
                .email(saved.getEmail())
                .emailVerificationRequired(true)
                .build();
    }

    @Transactional
    public LoginResponse refreshToken(RefreshTokenRequest request) {
        if (!jwtTokenProvider.validateToken(request.getRefreshToken())) {
            throw new InvalidTokenException("Refresh token invalide");
        }

        String tokenType = jwtTokenProvider.getTokenType(request.getRefreshToken());
        if (!"refresh".equals(tokenType)) {
            throw new InvalidTokenException("Le token fourni n'est pas un refresh token");
        }

        Session existingSession = sessionService.findActiveByRefreshToken(request.getRefreshToken());
        User user = existingSession.getUser();

        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = jwtTokenProvider.generateRefreshToken(user);

        existingSession.setAccessTokenHash(TokenHashUtils.sha256(accessToken));
        existingSession.setRefreshTokenHash(TokenHashUtils.sha256(refreshToken));
        existingSession.setLastActivityAt(LocalDateTime.now());
        existingSession.setExpiresAt(LocalDateTime.now().plusDays(30));
        sessionRepository.save(existingSession);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .mustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()))
                .user(LoginResponse.UserResponse.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .firstName(user.getFirstName())
                        .lastName(user.getLastName())
                        .username(user.getUsername())
                        .roles(roleNames(user.getRoles()))
                        .build())
                .build();
    }

    @Transactional
    public void logout(String accessToken) {
        sessionService.revokeByAccessToken(accessToken);
    }

    @Transactional
    public PasswordResetRequestResult requestPasswordReset(PasswordResetRequest request) {
        // Intentionally idempotent response to avoid user enumeration.
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);
        if (user == null) {
            return PasswordResetRequestResult.builder()
                    .accepted(true)
                    .queued(false)
                    .jobId(null)
                    .recipient(request.getEmail())
                    .fallbackRecipient(null)
                    .build();
        }

        PasswordResetMailQueueService.MailQueueResult queueResult =
                passwordResetMailQueueService.enqueuePasswordResetMail(user.getEmail());

        return PasswordResetRequestResult.builder()
                .accepted(queueResult.isAccepted())
                .queued(queueResult.isQueued())
                .jobId(queueResult.getJobId())
                .recipient(queueResult.getRecipient())
                .fallbackRecipient(queueResult.getFallbackRecipient())
                .build();
    }

    @Transactional
    public void confirmPasswordReset(PasswordResetConfirmRequest request) {
        if (request.getToken() == null || request.getToken().isBlank()) {
            throw new InvalidTokenException("Token de reset manquant");
        }

        validatePasswordPolicy(request.getNewPassword());

        if (!jwtTokenProvider.validateToken(request.getToken())) {
            throw new InvalidTokenException("Token invalide ou expiré");
        }

        String tokenType = jwtTokenProvider.getTokenType(request.getToken());
        if (!"password_reset".equals(tokenType)) {
            throw new InvalidTokenException("Type de token invalide pour un reset de mot de passe");
        }

        User user = userRepository.findById(jwtTokenProvider.extractUserIdFromToken(request.getToken()))
                .orElseThrow(() -> new InvalidTokenException("Utilisateur introuvable pour ce token"));

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChangedAt(LocalDateTime.now());
        user.setMustChangePassword(false);
        user.setStatus(User.UserStatus.ACTIVE);
        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            user.setEmailVerified(true);
            user.setEmailVerifiedAt(LocalDateTime.now());
        }
        userRepository.save(user);
    }

    private static Set<String> roleNames(Set<Role> roles) {
        Set<String> roleNames = new HashSet<>();
        for (Role role : roles) {
            roleNames.add(role.getName());
        }
        return roleNames;
    }

    private void validatePasswordPolicy(String password) {
        if (password == null
                || password.length() < 10
                || password.chars().noneMatch(Character::isUpperCase)
                || password.chars().noneMatch(Character::isLowerCase)
                || password.chars().noneMatch(Character::isDigit)) {
            throw new InvalidPasswordFormatException("minimum 10 caractères, avec majuscule, minuscule et chiffre");
        }
    }

    private Session.DeviceType parseDeviceType(String rawDeviceType) {
        if (rawDeviceType == null || rawDeviceType.isBlank()) {
            return Session.DeviceType.DESKTOP;
        }

        try {
            return Session.DeviceType.valueOf(rawDeviceType.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return Session.DeviceType.DESKTOP;
        }
    }

    private boolean isSameBrowser(Session existing, String deviceName, String userAgent, String deviceType) {
        if (deviceName != null && existing.getDeviceName() != null && existing.getDeviceName().equals(deviceName)) {
            return true;
        }

        Session.DeviceType incomingDeviceType = parseDeviceType(deviceType);
        return existing.getUserAgent() != null
                && userAgent != null
                && existing.getUserAgent().equals(userAgent)
                && existing.getDeviceType() == incomingDeviceType;
    }
}
