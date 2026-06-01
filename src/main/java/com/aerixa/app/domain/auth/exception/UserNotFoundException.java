package com.aerixa.app.domain.auth.exception;

/**
 * Levée quand un utilisateur est introuvable
 */
public class UserNotFoundException extends AuthDomainException {
    public UserNotFoundException(String email) {
        super("USER_NOT_FOUND", "auth.error.user_not_found", 
              String.format("Utilisateur non trouvé: %s", email));
    }

    public UserNotFoundException(java.util.UUID userId) {
        super("USER_NOT_FOUND", "auth.error.user_not_found", 
              String.format("Utilisateur non trouvé: %s", userId));
    }
}
