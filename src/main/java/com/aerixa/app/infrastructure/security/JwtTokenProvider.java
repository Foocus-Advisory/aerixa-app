package com.aerixa.app.infrastructure.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.InvalidTokenException;
import java.security.Key;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Component
@Slf4j
public class JwtTokenProvider {

    private final Key key;
    private final long accessTokenExpiryMs;
    private final long refreshTokenExpiryMs;
    private final long passwordResetTokenExpiryMs;

    public JwtTokenProvider(
            @Value("${security.jwt.secret:your-super-secret-key-change-in-prod}") String jwtSecret,
            @Value("${security.jwt.access-token-expiry:1800000}") long accessTokenExpiryMs,
            @Value("${security.jwt.refresh-token-expiry:2592000000}") long refreshTokenExpiryMs,
            @Value("${security.jwt.password-reset-token-expiry:86400000}") long passwordResetTokenExpiryMs) {
        this.key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
        this.accessTokenExpiryMs = accessTokenExpiryMs;
        this.refreshTokenExpiryMs = refreshTokenExpiryMs;
        this.passwordResetTokenExpiryMs = passwordResetTokenExpiryMs;
    }

    public String generateAccessToken(User user) {
        return generateToken(user.getId(), "access", accessTokenExpiryMs);
    }

    public String generateRefreshToken(User user) {
        return generateToken(user.getId(), "refresh", refreshTokenExpiryMs);
    }

    public String generatePasswordResetToken(User user) {
        return generateToken(user.getId(), "password_reset", passwordResetTokenExpiryMs);
    }

    private String generateToken(UUID userId, String type, long expiryMs) {
        Instant now = Instant.now();
        Instant expiryInstant = now.plusMillis(expiryMs);

        return Jwts.builder()
                .subject(userId.toString())
                .claim("type", type)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiryInstant))
                .issuer("aerixa-api")
                .audience().add("aerixa-users").and()
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public UUID extractUserIdFromToken(String token) {
        try {
            Claims claims = parseToken(token);
            return UUID.fromString(claims.getSubject());
        } catch (Exception e) {
            throw new InvalidTokenException("Token invalide ou expiré");
        }
    }

    public boolean validateToken(String token) {
        try {
            parseToken(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.warn("JWT token expired: {}", e.getMessage());
            return false;
        } catch (UnsupportedJwtException | MalformedJwtException | SignatureException | IllegalArgumentException e) {
            log.warn("JWT token validation failed: {}", e.getMessage());
            return false;
        }
    }

    private Claims parseToken(String token) {
        return Jwts.parser()
            .verifyWith((javax.crypto.SecretKey) key)
                .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    public String getTokenType(String token) {
        try {
            Claims claims = parseToken(token);
            return claims.get("type", String.class);
        } catch (Exception e) {
            return null;
        }
    }
}
