package com.aerixa.app.domain.auth.exception;

/**
 * Levée quand un utilisateur n'a pas les permissions pour effectuer une action
 */
public class PermissionDeniedException extends AuthDomainException {
    public PermissionDeniedException(String permission) {
        super("PERMISSION_DENIED", "auth.error.permission_denied", 
              String.format("Permission refusée: %s", permission));
    }
}
