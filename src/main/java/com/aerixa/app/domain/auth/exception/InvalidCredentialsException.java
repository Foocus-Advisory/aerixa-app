package com.aerixa.app.domain.auth.exception;

/**
 * Levée quand les credentials fournis (email/password) sont invalides
 */
public class InvalidCredentialsException extends AuthDomainException {
    public InvalidCredentialsException() {
        super("INVALID_CREDENTIALS", "auth.error.invalid_credentials", 
              "Email ou mot de passe incorrect");
    }
}
