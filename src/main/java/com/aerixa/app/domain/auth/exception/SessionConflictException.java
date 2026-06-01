package com.aerixa.app.domain.auth.exception;

/**
 * Levée quand une autre session active est détectée pour cet utilisateur
 */
public class SessionConflictException extends AuthDomainException {
    private final java.util.UUID existingSessionId;

    public SessionConflictException(java.util.UUID existingSessionId, String deviceName) {
        super("SESSION_CONFLICT", "auth.error.session_conflict", 
              String.format("Une autre session est active sur %s", deviceName));
        this.existingSessionId = existingSessionId;
    }

    public java.util.UUID getExistingSessionId() {
        return existingSessionId;
    }
}
