package com.aerixa.app.infrastructure.security;

import com.aerixa.app.infrastructure.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Chiffrement applicatif AES-256-GCM (envelope encryption).
 * Cle maitre: app.security.whatsapp.master-encryption-key (base64, 32 octets).
 * Une cle dediee par etablissement est generee, chiffree par la cle maitre,
 * et utilisee pour chiffrer les contenus de conversation (crypto-shredding possible).
 */
@Service
@RequiredArgsConstructor
public class EncryptionService {

    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH_BYTES = 12;
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final int KEY_LENGTH_BYTES = 32;

    private final AppProperties appProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    /** Genere une nouvelle cle de chiffrement dediee (ex: par etablissement), en clair. */
    public byte[] generateDataEncryptionKey() {
        byte[] key = new byte[KEY_LENGTH_BYTES];
        secureRandom.nextBytes(key);
        return key;
    }

    /** Chiffre une cle de donnees (DEK) avec la cle maitre. Retourne du base64. */
    public String encryptKeyWithMasterKey(byte[] dataEncryptionKey) {
        return encrypt(dataEncryptionKey, resolveMasterKey());
    }

    /** Dechiffre une cle de donnees (DEK) chiffree avec la cle maitre. */
    public byte[] decryptKeyWithMasterKey(String ciphertext) {
        return decrypt(ciphertext, resolveMasterKey());
    }

    /** Chiffre un texte (ex: access token WhatsApp) avec la cle maitre. Retourne du base64. */
    public String encryptWithMasterKey(String plaintext) {
        if (plaintext == null) {
            return null;
        }
        return encrypt(plaintext.getBytes(StandardCharsets.UTF_8), resolveMasterKey());
    }

    /** Dechiffre un texte chiffre avec la cle maitre. */
    public String decryptWithMasterKey(String ciphertext) {
        if (ciphertext == null) {
            return null;
        }
        return new String(decrypt(ciphertext, resolveMasterKey()), StandardCharsets.UTF_8);
    }

    /** Chiffre un texte (ex: contenu de message) avec une cle dediee (ex: cle d'etablissement). Retourne du base64. */
    public String encryptWithKey(String plaintext, byte[] dataEncryptionKey) {
        if (plaintext == null) {
            return null;
        }
        return encrypt(plaintext.getBytes(StandardCharsets.UTF_8), dataEncryptionKey);
    }

    /** Dechiffre un texte chiffre avec une cle dediee. */
    public String decryptWithKey(String ciphertext, byte[] dataEncryptionKey) {
        if (ciphertext == null) {
            return null;
        }
        return new String(decrypt(ciphertext, dataEncryptionKey), StandardCharsets.UTF_8);
    }

    private String encrypt(byte[] plaintext, byte[] key) {
        try {
            byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            SecretKey secretKey = new SecretKeySpec(key, ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));

            byte[] encrypted = cipher.doFinal(plaintext);

            ByteBuffer buffer = ByteBuffer.allocate(iv.length + encrypted.length);
            buffer.put(iv);
            buffer.put(encrypted);

            return Base64.getEncoder().encodeToString(buffer.array());
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Echec du chiffrement", e);
        }
    }

    private byte[] decrypt(String ciphertextBase64, byte[] key) {
        try {
            byte[] data = Base64.getDecoder().decode(ciphertextBase64);
            ByteBuffer buffer = ByteBuffer.wrap(data);

            byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
            buffer.get(iv);

            byte[] encrypted = new byte[buffer.remaining()];
            buffer.get(encrypted);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            SecretKey secretKey = new SecretKeySpec(key, ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));

            return cipher.doFinal(encrypted);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Echec du dechiffrement", e);
        }
    }

    private byte[] resolveMasterKey() {
        String masterKeyBase64 = appProperties.getSecurity().getWhatsapp().getMasterEncryptionKey();
        if (masterKeyBase64 == null || masterKeyBase64.isBlank()) {
            throw new IllegalStateException("La cle maitre de chiffrement WhatsApp (app.security.whatsapp.master-encryption-key) n'est pas configuree");
        }

        byte[] key = Base64.getDecoder().decode(masterKeyBase64.trim());
        if (key.length != KEY_LENGTH_BYTES) {
            throw new IllegalStateException("La cle maitre de chiffrement WhatsApp doit faire 32 octets (256 bits) une fois decodee en base64");
        }
        return key;
    }
}
