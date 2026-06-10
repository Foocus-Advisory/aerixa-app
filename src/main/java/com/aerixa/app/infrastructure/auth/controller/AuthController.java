package com.aerixa.app.infrastructure.auth.controller;

import com.aerixa.app.application.auth.dto.*;
import com.aerixa.app.application.auth.service.AuthService;
import com.aerixa.app.infrastructure.api.ApiSuccessResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Endpoints d'authentification")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Connexion utilisateur")
    public ResponseEntity<LoginResponse> login(@RequestBody @Valid LoginRequest request,
                                               @RequestHeader(value = "X-Forwarded-For", required = false) String forwardedFor,
                                               @RequestHeader(value = "User-Agent", required = false) String userAgent,
                                               @RequestHeader(value = "X-Device-Name", required = false) String deviceName,
                                               @RequestHeader(value = "X-Device-Type", required = false) String deviceType,
                                               @RequestHeader(value = "X-Real-IP", required = false) String realIp) {
        String ipAddress = resolveIpAddress(forwardedFor, realIp);
        LoginResponse response = authService.login(request, ipAddress, userAgent, deviceName, deviceType);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    @Operation(summary = "Inscription ADMIN")
    public ResponseEntity<RegisterResponse> register(@RequestBody @Valid RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @GetMapping("/google/config")
    @Operation(summary = "Configuration publique Google Sign-In")
    public ResponseEntity<GoogleAuthConfigResponse> googleConfig() {
        return ResponseEntity.ok(authService.getGoogleAuthConfig());
    }

    @PostMapping("/google/login")
    @Operation(summary = "Connexion via Google")
    public ResponseEntity<LoginResponse> loginWithGoogle(@RequestBody @Valid GoogleAuthRequest request,
                                                         @RequestHeader(value = "X-Forwarded-For", required = false) String forwardedFor,
                                                         @RequestHeader(value = "User-Agent", required = false) String userAgent,
                                                         @RequestHeader(value = "X-Device-Name", required = false) String deviceName,
                                                         @RequestHeader(value = "X-Device-Type", required = false) String deviceType,
                                                         @RequestHeader(value = "X-Real-IP", required = false) String realIp) {
        String ipAddress = resolveIpAddress(forwardedFor, realIp);
        return ResponseEntity.ok(authService.loginWithGoogle(request, ipAddress, userAgent, deviceName, deviceType));
    }

    @PostMapping("/google/register")
    @Operation(summary = "Inscription via Google")
    public ResponseEntity<LoginResponse> registerWithGoogle(@RequestBody @Valid GoogleAuthRequest request,
                                                            @RequestHeader(value = "X-Forwarded-For", required = false) String forwardedFor,
                                                            @RequestHeader(value = "User-Agent", required = false) String userAgent,
                                                            @RequestHeader(value = "X-Device-Name", required = false) String deviceName,
                                                            @RequestHeader(value = "X-Device-Type", required = false) String deviceType,
                                                            @RequestHeader(value = "X-Real-IP", required = false) String realIp) {
        String ipAddress = resolveIpAddress(forwardedFor, realIp);
        return ResponseEntity.ok(authService.registerWithGoogle(request, ipAddress, userAgent, deviceName, deviceType));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Renouveler les tokens")
    public ResponseEntity<LoginResponse> refresh(@RequestBody @Valid RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refreshToken(request));
    }

    @PostMapping("/verify-mfa")
    @Operation(summary = "Verifier un challenge MFA")
    public ResponseEntity<LoginResponse> verifyMfa(@RequestBody @Valid MfaVerifyRequest request,
                                                   @RequestHeader(value = "X-Forwarded-For", required = false) String forwardedFor,
                                                   @RequestHeader(value = "User-Agent", required = false) String userAgent,
                                                   @RequestHeader(value = "X-Device-Name", required = false) String deviceName,
                                                   @RequestHeader(value = "X-Device-Type", required = false) String deviceType,
                                                   @RequestHeader(value = "X-Real-IP", required = false) String realIp) {
        String ipAddress = resolveIpAddress(forwardedFor, realIp);
        return ResponseEntity.ok(authService.verifyMfa(request, ipAddress, userAgent, deviceName, deviceType));
    }

    @PostMapping("/mfa/setup/initiate")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Initialiser la configuration MFA TOTP")
    public ResponseEntity<MfaSetupInitResponse> initiateMfaSetup(Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(authService.initiateMfaSetup(userId));
    }

    @PostMapping("/mfa/setup/confirm")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Confirmer et activer la MFA TOTP")
    public ResponseEntity<MfaSetupConfirmResponse> confirmMfaSetup(Authentication authentication,
                                                                   @RequestBody @Valid MfaSetupConfirmRequest request) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(authService.confirmMfaSetup(userId, request));
    }

    @PostMapping("/logout")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Déconnexion")
    public ResponseEntity<Void> logout(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader) {
        String token = extractBearerToken(authorizationHeader);
        authService.logout(token);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/password-reset/request")
    @Operation(summary = "Demander un reset de mot de passe")
    public ResponseEntity<ApiSuccessResponse<PasswordResetRequestResult>> requestPasswordReset(
            @RequestBody @Valid PasswordResetRequest request,
            HttpServletRequest httpRequest) {
        PasswordResetRequestResult result = authService.requestPasswordReset(request);

        ApiSuccessResponse<PasswordResetRequestResult> response = ApiSuccessResponse.<PasswordResetRequestResult>builder()
                .success(true)
                .message("Password reset request accepted")
                .timestamp(LocalDateTime.now())
                .path(httpRequest.getRequestURI())
                .statusCode(HttpStatus.ACCEPTED.value())
                .data(result)
                .build();

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @PostMapping("/password-reset/confirm")
    @Operation(summary = "Confirmer le reset de mot de passe")
    public ResponseEntity<Map<String, String>> confirmPasswordReset(@RequestBody @Valid PasswordResetConfirmRequest request) {
        authService.confirmPasswordReset(request);
        return ResponseEntity.ok(Map.of("message", "Password reset confirmé"));
    }

    @GetMapping("/health")
    @Operation(summary = "Healthcheck du module auth")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "module", "auth"));
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Header Authorization invalide");
        }
        return authorizationHeader.substring(7);
    }

    private String resolveIpAddress(String forwardedFor, String realIp) {
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        if (realIp != null && !realIp.isBlank()) {
            return realIp;
        }
        return "0.0.0.0";
    }
}
