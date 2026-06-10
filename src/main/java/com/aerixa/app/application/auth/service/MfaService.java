package com.aerixa.app.application.auth.service;

import com.aerixa.app.application.auth.dto.MfaChallengeResponse;
import com.aerixa.app.application.auth.dto.MfaSetupConfirmRequest;
import com.aerixa.app.application.auth.dto.MfaSetupConfirmResponse;
import com.aerixa.app.application.auth.dto.MfaSetupInitResponse;
import com.aerixa.app.domain.auth.entity.MfaChallenge;
import com.aerixa.app.domain.auth.entity.MfaRecoveryCode;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.InvalidCredentialsException;
import com.aerixa.app.domain.auth.exception.InvalidTokenException;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.MfaChallengeRepository;
import com.aerixa.app.domain.auth.repository.MfaRecoveryCodeRepository;
import com.aerixa.app.domain.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MfaService {

    private static final String TOTP_METHOD = "totp";
    private static final String BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final int TOTP_DIGITS = 6;
    private static final int TOTP_PERIOD_SECONDS = 30;

    private final UserRepository userRepository;
    private final MfaChallengeRepository mfaChallengeRepository;
    private final MfaRecoveryCodeRepository mfaRecoveryCodeRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.security.mfa.enabled:false}")
    private boolean mfaEnabled;

    @Value("${app.security.mfa.challenge-expiry-seconds:300}")
    private long challengeExpirySeconds;

    @Value("${app.security.mfa.totp-window:1}")
    private int totpWindow;

    @Value("${app.security.mfa.issuer:AERIXA}")
    private String issuer;

    @Value("${app.security.mfa.encryption-key:change-me-mfa-encryption-key}")
    private String encryptionKey;

    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional(readOnly = true)
    public MfaSetupInitResponse initiateTotpSetup(UUID userId) {
        ensureMfaEnabled();
        User user = userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));

        String secret = generateTotpSecret();
        String qrCodeUri = buildOtpAuthUri(user.getEmail(), secret);

        return MfaSetupInitResponse.builder()
                .secret(secret)
                .qrCodeUri(qrCodeUri)
                .build();
    }

    @Transactional
    public MfaSetupConfirmResponse confirmTotpSetup(UUID userId, MfaSetupConfirmRequest request) {
        ensureMfaEnabled();
        if (request == null || request.getSecret() == null || request.getCode() == null) {
            throw new IllegalArgumentException("Secret et code MFA requis");
        }

        User user = userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));

        if (!verifyTotpCode(request.getSecret(), request.getCode())) {
            throw new InvalidCredentialsException();
        }

        user.setMfaEnabled(true);
        user.setMfaMethod(TOTP_METHOD);
        user.setTotpSecret(encrypt(request.getSecret()));
        user.setMfaVerifiedAt(LocalDateTime.now());
        userRepository.save(user);

        List<String> recoveryCodes = generateRecoveryCodes();
        mfaRecoveryCodeRepository.deleteByUserId(userId);

        List<MfaRecoveryCode> entities = recoveryCodes.stream()
            .map(code -> (MfaRecoveryCode) MfaRecoveryCode.builder()
                        .user(user)
                        .codeHash(passwordEncoder.encode(code))
                        .used(false)
                        .build())
                .toList();
        mfaRecoveryCodeRepository.saveAllCodes(entities);

        return MfaSetupConfirmResponse.builder()
                .recoveryCodes(recoveryCodes)
                .build();
    }

    @Transactional
    public MfaChallengeResponse createLoginChallenge(UUID userId) {
        ensureMfaEnabled();

        User user = userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));
        if (!Boolean.TRUE.equals(user.getMfaEnabled()) || user.getTotpSecret() == null || user.getTotpSecret().isBlank()) {
            throw new InvalidTokenException("MFA n'est pas configuré pour cet utilisateur");
        }

        mfaChallengeRepository.deleteExpired(LocalDateTime.now());

        MfaChallenge challenge = MfaChallenge.builder()
                .user(user)
                .challengeType(TOTP_METHOD)
                .attemptCount(0)
                .maxAttempts(3)
                .expiresAt(LocalDateTime.now().plusSeconds(challengeExpirySeconds))
                .build();

        MfaChallenge saved = mfaChallengeRepository.save(challenge);

        return MfaChallengeResponse.builder()
                .challengeId(saved.getId())
                .method(TOTP_METHOD)
                .expiresAt(saved.getExpiresAt())
                .build();
    }

    @Transactional
    public User verifyLoginChallenge(UUID challengeId, String code) {
        ensureMfaEnabled();
        if (challengeId == null || code == null || code.isBlank()) {
            throw new InvalidTokenException("Challenge MFA invalide");
        }

        MfaChallenge challenge = mfaChallengeRepository.findById(challengeId)
                .orElseThrow(() -> new InvalidTokenException("Challenge MFA introuvable"));

        if (challenge.getVerifiedAt() != null) {
            throw new InvalidTokenException("Challenge MFA deja utilise");
        }
        if (challenge.isExpired()) {
            throw new InvalidTokenException("Challenge MFA expire");
        }
        if (challenge.getAttemptCount() >= challenge.getMaxAttempts()) {
            throw new InvalidTokenException("Trop de tentatives MFA");
        }

        User user = challenge.getUser();
        String decryptedSecret = decrypt(user.getTotpSecret());

        challenge.setAttemptCount(challenge.getAttemptCount() + 1);

        if (!verifyTotpCode(decryptedSecret, code)) {
            mfaChallengeRepository.save(challenge);
            throw new InvalidCredentialsException();
        }

        challenge.setVerifiedAt(LocalDateTime.now());
        mfaChallengeRepository.save(challenge);

        return user;
    }

    private void ensureMfaEnabled() {
        if (!mfaEnabled) {
            throw new IllegalArgumentException("MFA desactive globalement");
        }
    }

    private List<String> generateRecoveryCodes() {
        List<String> codes = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            codes.add(randomUpperAlphaNumeric(10));
        }
        return codes;
    }

    private String randomUpperAlphaNumeric(int length) {
        final String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(alphabet.charAt(secureRandom.nextInt(alphabet.length())));
        }
        return sb.toString();
    }

    private String buildOtpAuthUri(String email, String secret) {
        String normalizedIssuer = issuer == null || issuer.isBlank() ? "AERIXA" : issuer;
        String label = normalizedIssuer + ":" + email;
        return "otpauth://totp/"
                + urlEncode(label)
                + "?secret=" + secret
                + "&issuer=" + urlEncode(normalizedIssuer)
                + "&algorithm=SHA1&digits=" + TOTP_DIGITS
                + "&period=" + TOTP_PERIOD_SECONDS;
    }

    private String urlEncode(String value) {
        return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String generateTotpSecret() {
        byte[] random = new byte[20];
        secureRandom.nextBytes(random);
        return base32Encode(random);
    }

    private boolean verifyTotpCode(String base32Secret, String code) {
        if (base32Secret == null || base32Secret.isBlank()) {
            return false;
        }
        if (code == null || !code.trim().matches("\\d{6}")) {
            return false;
        }

        long currentCounter = System.currentTimeMillis() / 1000L / TOTP_PERIOD_SECONDS;
        String normalizedCode = code.trim();

        for (int i = -totpWindow; i <= totpWindow; i++) {
            String expected = generateTotpCode(base32Secret, currentCounter + i);
            if (expected.equals(normalizedCode)) {
                return true;
            }
        }

        return false;
    }

    private String generateTotpCode(String base32Secret, long counter) {
        try {
            byte[] key = base32Decode(base32Secret);
            byte[] data = ByteBuffer.allocate(8).putLong(counter).array();

            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(data);

            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);

            int otp = binary % (int) Math.pow(10, TOTP_DIGITS);
            return String.format("%0" + TOTP_DIGITS + "d", otp);
        } catch (Exception e) {
            throw new IllegalStateException("Impossible de calculer le code TOTP", e);
        }
    }

    private String base32Encode(byte[] data) {
        StringBuilder encoded = new StringBuilder();
        int buffer = 0;
        int bitsLeft = 0;

        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xFF);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                encoded.append(BASE32_ALPHABET.charAt((buffer >> (bitsLeft - 5)) & 0x1F));
                bitsLeft -= 5;
            }
        }

        if (bitsLeft > 0) {
            encoded.append(BASE32_ALPHABET.charAt((buffer << (5 - bitsLeft)) & 0x1F));
        }

        return encoded.toString();
    }

    private byte[] base32Decode(String value) {
        String normalized = value.replace("=", "").replace(" ", "").toUpperCase();
        ByteBuffer out = ByteBuffer.allocate((normalized.length() * 5) / 8 + 1);

        int buffer = 0;
        int bitsLeft = 0;
        for (char c : normalized.toCharArray()) {
            int idx = BASE32_ALPHABET.indexOf(c);
            if (idx < 0) {
                throw new IllegalArgumentException("Secret TOTP invalide");
            }
            buffer = (buffer << 5) | idx;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                out.put((byte) ((buffer >> (bitsLeft - 8)) & 0xFF));
                bitsLeft -= 8;
            }
        }

        byte[] result = new byte[out.position()];
        out.flip();
        out.get(result);
        return result;
    }

    private String encrypt(String plain) {
        try {
            byte[] iv = new byte[12];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, buildAesKey(), new GCMParameterSpec(128, iv));
            byte[] encrypted = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));

            byte[] out = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, out, 0, iv.length);
            System.arraycopy(encrypted, 0, out, iv.length, encrypted.length);
            return Base64.getEncoder().encodeToString(out);
        } catch (Exception e) {
            throw new IllegalStateException("Impossible de chiffrer le secret MFA", e);
        }
    }

    private String decrypt(String encryptedValue) {
        try {
            byte[] all = Base64.getDecoder().decode(encryptedValue);
            byte[] iv = new byte[12];
            byte[] cipherText = new byte[all.length - 12];

            System.arraycopy(all, 0, iv, 0, 12);
            System.arraycopy(all, 12, cipherText, 0, cipherText.length);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, buildAesKey(), new GCMParameterSpec(128, iv));
            byte[] plain = cipher.doFinal(cipherText);

            return new String(plain, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Impossible de dechiffrer le secret MFA", e);
        }
    }

    private SecretKeySpec buildAesKey() {
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(encryptionKey);
        } catch (IllegalArgumentException ex) {
            keyBytes = sha256(encryptionKey.getBytes(StandardCharsets.UTF_8));
        }

        if (keyBytes.length != 16 && keyBytes.length != 24 && keyBytes.length != 32) {
            keyBytes = java.util.Arrays.copyOf(sha256(keyBytes), 32);
        }

        return new SecretKeySpec(keyBytes, "AES");
    }

    private byte[] sha256(byte[] input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return digest.digest(input);
        } catch (Exception e) {
            throw new IllegalStateException("Erreur de hash SHA-256", e);
        }
    }
}
