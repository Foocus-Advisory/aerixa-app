package com.aerixa.app.domain.auth.exception;

/**
 * Levée quand un utilisateur a un compte suspendu/disabled
 */
public class UserDisabledException extends AuthDomainException {
    public UserDisabledException(String email) {
        super("USER_DISABLED", "auth.error.user_disabled", 
              String.format("Compte utilisateur suspendu: %s", email));
    }
}
