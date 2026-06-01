package com.aerixa.app.domain.auth.exception;

/**
 * Exception de base pour le domaine Auth
 */
public abstract class AuthDomainException extends RuntimeException {
    private final String errorCode;
    private final String messageKey;

    public AuthDomainException(String errorCode, String messageKey, String message) {
        super(message);
        this.errorCode = errorCode;
        this.messageKey = messageKey;
    }

    public AuthDomainException(String errorCode, String messageKey, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.messageKey = messageKey;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public String getMessageKey() {
        return messageKey;
    }
}
