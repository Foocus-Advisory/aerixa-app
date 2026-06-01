package com.aerixa.app.domain.auth.exception;

/**
 * Levée quand l'email n'est pas vérifié et que c'est requis
 */
public class EmailNotVerifiedException extends AuthDomainException {
    public EmailNotVerifiedException(String email) {
        super("EMAIL_NOT_VERIFIED", "auth.error.email_not_verified", 
              String.format("Email non vérifié: %s", email));
    }
}
