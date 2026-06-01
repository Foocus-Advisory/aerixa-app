package com.aerixa.app.domain.auth.exception;

/**
 * Levée quand le mot de passe fourni ne respecte pas la politique
 */
public class InvalidPasswordFormatException extends AuthDomainException {
    public InvalidPasswordFormatException(String details) {
        super("INVALID_PASSWORD_FORMAT", "auth.error.invalid_password_format", 
              String.format("Mot de passe invalide: %s", details));
    }
}
