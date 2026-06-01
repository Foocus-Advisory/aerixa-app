package com.aerixa.app.domain.auth.exception;

/**
 * Levée quand une session est expirée ou révoquée
 */
public class SessionExpiredException extends AuthDomainException {
    public SessionExpiredException() {
        super("SESSION_EXPIRED", "auth.error.session_expired", 
              "Session expirée ou révoquée");
    }
}
