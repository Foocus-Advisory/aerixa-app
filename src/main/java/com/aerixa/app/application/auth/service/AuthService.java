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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

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
    private final MfaService mfaService;

        @Value("${app.security.sso.google.enabled:false}")
        private boolean googleEnabled;

        @Value("${app.security.sso.google.client-id:}")
        private String googleClientId;

        @Value("${app.security.sso.google.jit-provisioning-enabled:true}")
        private boolean googleJitProvisioningEnabled;

        @Value("${app.security.sso.google.domain-restrictions:}")
        private String googleDomainRestrictions;

        private final RestClient googleRestClient = RestClient.builder()
            .baseUrl("https://oauth2.googleapis.com")
            .build();

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

        if (Boolean.TRUE.equals(user.getMfaEnabled())) {
            MfaChallengeResponse challenge = mfaService.createLoginChallenge(user.getId());
            return LoginResponse.builder()
                    .mustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()))
                    .mfaRequired(true)
                    .mfaChallengeId(challenge.getChallengeId())
                    .mfaMethod(challenge.getMethod())
                    .mfaExpiresAt(challenge.getExpiresAt())
                    .build();
        }

        return createAuthenticatedLoginResponse(user, ipAddress, userAgent, deviceName, deviceType);
    }

    @Transactional
    public LoginResponse verifyMfa(MfaVerifyRequest request, String ipAddress, String userAgent, String deviceName, String deviceType) {
        if (request == null || request.getChallengeId() == null || request.getCode() == null || request.getCode().isBlank()) {
            throw new InvalidTokenException("Challenge MFA invalide");
        }

        User user = mfaService.verifyLoginChallenge(request.getChallengeId(), request.getCode());
        return createAuthenticatedLoginResponse(user, ipAddress, userAgent, deviceName, deviceType);
    }

    @Transactional
    public MfaSetupInitResponse initiateMfaSetup(UUID userId) {
        return mfaService.initiateTotpSetup(userId);
    }

    @Transactional
    public MfaSetupConfirmResponse confirmMfaSetup(UUID userId, MfaSetupConfirmRequest request) {
        return mfaService.confirmTotpSetup(userId, request);
    }

    private LoginResponse createAuthenticatedLoginResponse(User user, String ipAddress, String userAgent, String deviceName, String deviceType) {
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
            .mfaRequired(false)
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

    @Transactional(readOnly = true)
    public GoogleAuthConfigResponse getGoogleAuthConfig() {
        return GoogleAuthConfigResponse.builder()
                .enabled(googleEnabled && googleClientId != null && !googleClientId.isBlank())
                .clientId(googleEnabled ? googleClientId : null)
                .build();
    }

    @Transactional
    public LoginResponse loginWithGoogle(GoogleAuthRequest request, String ipAddress, String userAgent, String deviceName, String deviceType) {
        GoogleIdentity identity = verifyGoogleIdToken(request.getIdToken());
        User user = resolveGoogleLoginUser(identity);

        if (Boolean.TRUE.equals(user.getMfaEnabled())) {
            MfaChallengeResponse challenge = mfaService.createLoginChallenge(user.getId());
            return LoginResponse.builder()
                    .mustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()))
                    .mfaRequired(true)
                    .mfaChallengeId(challenge.getChallengeId())
                    .mfaMethod(challenge.getMethod())
                    .mfaExpiresAt(challenge.getExpiresAt())
                    .build();
        }

        return createAuthenticatedLoginResponse(user, ipAddress, userAgent, deviceName, deviceType);
    }

    @Transactional
    public LoginResponse registerWithGoogle(GoogleAuthRequest request, String ipAddress, String userAgent, String deviceName, String deviceType) {
        GoogleIdentity identity = verifyGoogleIdToken(request.getIdToken());
        User user = resolveGoogleRegisterUser(identity);

        if (Boolean.TRUE.equals(user.getMfaEnabled())) {
            MfaChallengeResponse challenge = mfaService.createLoginChallenge(user.getId());
            return LoginResponse.builder()
                    .mustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()))
                    .mfaRequired(true)
                    .mfaChallengeId(challenge.getChallengeId())
                    .mfaMethod(challenge.getMethod())
                    .mfaExpiresAt(challenge.getExpiresAt())
                    .build();
        }

        return createAuthenticatedLoginResponse(user, ipAddress, userAgent, deviceName, deviceType);
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

        Session existingSession = sessionService.findActiveByRefreshTokenForUpdate(request.getRefreshToken());
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
            .mfaRequired(false)
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

    private GoogleIdentity verifyGoogleIdToken(String idToken) {
        ensureGoogleEnabled();

        if (idToken == null || idToken.isBlank()) {
            throw new IllegalArgumentException("Jeton Google manquant");
        }

        try {
            GoogleTokenInfoResponse payload = googleRestClient.get()
                    .uri(uriBuilder -> uriBuilder.path("/tokeninfo").queryParam("id_token", idToken).build())
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(GoogleTokenInfoResponse.class);

            if (payload == null || payload.getSub() == null || payload.getEmail() == null) {
                throw new IllegalArgumentException("Réponse Google incomplète");
            }

            if (!googleClientId.equals(payload.getAud())) {
                throw new IllegalArgumentException("Le jeton Google ne correspond pas au client configuré");
            }

            if (!"https://accounts.google.com".equals(payload.getIss()) && !"accounts.google.com".equals(payload.getIss())) {
                throw new IllegalArgumentException("Issuer Google invalide");
            }

            if (!Boolean.parseBoolean(payload.getEmailVerified())) {
                throw new IllegalArgumentException("Le compte Google doit avoir un email vérifié");
            }

            long expiryEpochSeconds = Long.parseLong(payload.getExp());
            if (Instant.ofEpochSecond(expiryEpochSeconds).isBefore(Instant.now())) {
                throw new IllegalArgumentException("Le jeton Google a expiré");
            }

            enforceGoogleDomainRestrictions(payload.getEmail());

            return new GoogleIdentity(
                    payload.getSub().trim(),
                    payload.getEmail().trim().toLowerCase(Locale.ROOT),
                    emptyToNull(payload.getGivenName()),
                    emptyToNull(payload.getFamilyName()),
                    emptyToNull(payload.getName())
            );
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalArgumentException("Impossible de vérifier le jeton Google", ex);
        }
    }

    private User resolveGoogleLoginUser(GoogleIdentity identity) {
        User linkedUser = userRepository.findByGoogleSubject(identity.subject()).orElse(null);
        User emailUser = userRepository.findByEmail(identity.email()).orElse(null);

        if (linkedUser != null) {
            if (!linkedUser.getEmail().equalsIgnoreCase(identity.email())) {
                throw new IllegalArgumentException("Le compte Google fourni ne correspond pas au compte AERIXA lié");
            }
            validateGoogleEligibleUser(linkedUser);
            return linkedUser;
        }

        if (emailUser == null) {
            throw new IllegalArgumentException("Aucun compte AERIXA n'est associé à cette adresse Google. Utilisez l'inscription Google.");
        }

        validateGoogleEligibleUser(emailUser);
        linkGoogleIdentity(emailUser, identity);
        return userRepository.save(emailUser);
    }

    private User resolveGoogleRegisterUser(GoogleIdentity identity) {
        User linkedUser = userRepository.findByGoogleSubject(identity.subject()).orElse(null);
        if (linkedUser != null) {
            validateGoogleEligibleUser(linkedUser);
            return linkedUser;
        }

        if (userRepository.findByEmail(identity.email()).isPresent()) {
            throw new IllegalArgumentException("Un compte AERIXA existe déjà avec cette adresse. Utilisez la connexion Google.");
        }

        if (!googleJitProvisioningEnabled) {
            throw new IllegalArgumentException("L'inscription Google est désactivée pour le moment");
        }

        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseThrow(() -> new IllegalStateException("Le rôle ADMIN est introuvable"));

        User user = User.builder()
                .email(identity.email())
                .username(null)
                .firstName(identity.firstName())
                .lastName(identity.lastName())
                .phoneNumber(null)
                .passwordHash(passwordEncoder.encode(UUID.randomUUID() + ":google:" + identity.subject()))
                .status(User.UserStatus.ACTIVE)
                .emailVerified(true)
                .emailVerifiedAt(LocalDateTime.now())
                .mustChangePassword(false)
            .mfaEnabled(false)
                .roles(Set.of(adminRole))
                .googleSubject(identity.subject())
                .googleLinkedAt(LocalDateTime.now())
                .build();

        return userRepository.save(user);
    }

    private void validateGoogleEligibleUser(User user) {
        if (user.getStatus() == User.UserStatus.DISABLED) {
            throw new UserDisabledException(user.getEmail());
        }
    }

    private void linkGoogleIdentity(User user, GoogleIdentity identity) {
        user.setGoogleSubject(identity.subject());
        user.setGoogleLinkedAt(LocalDateTime.now());

        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            user.setEmailVerified(true);
            user.setEmailVerifiedAt(LocalDateTime.now());
        }

        if ((user.getFirstName() == null || user.getFirstName().isBlank()) && identity.firstName() != null) {
            user.setFirstName(identity.firstName());
        }

        if ((user.getLastName() == null || user.getLastName().isBlank()) && identity.lastName() != null) {
            user.setLastName(identity.lastName());
        }
    }

    private void ensureGoogleEnabled() {
        if (!googleEnabled || googleClientId == null || googleClientId.isBlank()) {
            throw new IllegalArgumentException("Google Sign-In est désactivé");
        }
    }

    private void enforceGoogleDomainRestrictions(String email) {
        if (googleDomainRestrictions == null || googleDomainRestrictions.isBlank()) {
            return;
        }

        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        int atIndex = normalizedEmail.lastIndexOf('@');
        if (atIndex < 0 || atIndex == normalizedEmail.length() - 1) {
            throw new IllegalArgumentException("Adresse email Google invalide");
        }

        String domain = normalizedEmail.substring(atIndex + 1);
        boolean allowed = Arrays.stream(googleDomainRestrictions.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> value.toLowerCase(Locale.ROOT))
                .anyMatch(domain::equals);

        if (!allowed) {
            throw new IllegalArgumentException("Le domaine Google n'est pas autorisé pour cette application");
        }
    }

    private String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record GoogleIdentity(String subject, String email, String firstName, String lastName, String fullName) {
    }

    @lombok.Data
    private static class GoogleTokenInfoResponse {
        private String iss;
        private String aud;
        private String sub;
        private String email;
        private String emailVerified;
        private String exp;
        private String givenName;
        private String familyName;
        private String name;

        @com.fasterxml.jackson.annotation.JsonProperty("email_verified")
        public void setEmailVerified(String emailVerified) {
            this.emailVerified = emailVerified;
        }

        @com.fasterxml.jackson.annotation.JsonProperty("given_name")
        public void setGivenName(String givenName) {
            this.givenName = givenName;
        }

        @com.fasterxml.jackson.annotation.JsonProperty("family_name")
        public void setFamilyName(String familyName) {
            this.familyName = familyName;
        }
    }
}
