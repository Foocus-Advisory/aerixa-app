package com.aerixa.app.domain.auth.exception;

/**
 * Levée quand un token JWT est invalide ou expiré
 */
public class InvalidTokenException extends AuthDomainException {
    public InvalidTokenException(String message) {
        super("INVALID_TOKEN", "auth.error.invalid_token", message);
    }
}
