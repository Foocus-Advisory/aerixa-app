package com.aerixa.app.infrastructure.error;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import com.aerixa.app.domain.auth.exception.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleInvalidCredentials(
            InvalidCredentialsException ex, WebRequest request) {
        return buildErrorResponse(ex, HttpStatus.UNAUTHORIZED, request);
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(
            UserNotFoundException ex, WebRequest request) {
        return buildErrorResponse(ex, HttpStatus.NOT_FOUND, request);
    }

    @ExceptionHandler(UserDisabledException.class)
    public ResponseEntity<ErrorResponse> handleUserDisabled(
            UserDisabledException ex, WebRequest request) {
        return buildErrorResponse(ex, HttpStatus.FORBIDDEN, request);
    }

    @ExceptionHandler(EmailNotVerifiedException.class)
    public ResponseEntity<ErrorResponse> handleEmailNotVerified(
            EmailNotVerifiedException ex, WebRequest request) {
        return buildErrorResponse(ex, HttpStatus.FORBIDDEN, request);
    }

    @ExceptionHandler(InvalidPasswordFormatException.class)
    public ResponseEntity<ErrorResponse> handleInvalidPasswordFormat(
            InvalidPasswordFormatException ex, WebRequest request) {
        return buildErrorResponse(ex, HttpStatus.BAD_REQUEST, request);
    }

    @ExceptionHandler(InvalidTokenException.class)
    public ResponseEntity<ErrorResponse> handleInvalidToken(
            InvalidTokenException ex, WebRequest request) {
        return buildErrorResponse(ex, HttpStatus.UNAUTHORIZED, request);
    }

    @ExceptionHandler(SessionExpiredException.class)
    public ResponseEntity<ErrorResponse> handleSessionExpired(
            SessionExpiredException ex, WebRequest request) {
        return buildErrorResponse(ex, HttpStatus.UNAUTHORIZED, request);
    }

    @ExceptionHandler(SessionConflictException.class)
    public ResponseEntity<ErrorResponse> handleSessionConflict(
            SessionConflictException ex, WebRequest request) {
        ErrorResponse response = buildErrorResponseBase(ex, HttpStatus.CONFLICT, request);
        Map<String, Object> details = new HashMap<>();
        if (ex.getExistingSessionId() != null) {
            details.put("existingSessionId", ex.getExistingSessionId().toString());
        }
        response.setDetails(details);
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(
            IllegalArgumentException ex, WebRequest request) {
        ErrorResponse response = ErrorResponse.builder()
                .errorCode("BAD_REQUEST")
                .message(ex.getMessage())
                .messageKey("error.bad_request")
                .timestamp(LocalDateTime.now())
                .path(request.getDescription(false).replace("uri=", ""))
                .statusCode(HttpStatus.BAD_REQUEST.value())
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<ErrorResponse> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, WebRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(fieldError -> fieldError.getField() + " " + fieldError.getDefaultMessage())
            .orElse("Requête invalide");

        ErrorResponse response = ErrorResponse.builder()
            .errorCode("BAD_REQUEST")
            .message(message)
            .messageKey("error.bad_request")
            .timestamp(LocalDateTime.now())
            .path(request.getDescription(false).replace("uri=", ""))
            .statusCode(HttpStatus.BAD_REQUEST.value())
            .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        @ExceptionHandler(HttpMessageNotReadableException.class)
        public ResponseEntity<ErrorResponse> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex, WebRequest request) {
        ErrorResponse response = ErrorResponse.builder()
            .errorCode("BAD_REQUEST")
            .message("Corps de requête invalide")
            .messageKey("error.bad_request")
            .timestamp(LocalDateTime.now())
            .path(request.getDescription(false).replace("uri=", ""))
            .statusCode(HttpStatus.BAD_REQUEST.value())
            .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        @ExceptionHandler(MaxUploadSizeExceededException.class)
        public ResponseEntity<ErrorResponse> handleMaxUploadSizeExceeded(
            MaxUploadSizeExceededException ex, WebRequest request) {
        ErrorResponse response = ErrorResponse.builder()
            .errorCode("PAYLOAD_TOO_LARGE")
            .message("Le fichier depasse la taille maximale autorisee (5 Mo)")
            .messageKey("error.payload_too_large")
            .timestamp(LocalDateTime.now())
            .path(request.getDescription(false).replace("uri=", ""))
            .statusCode(HttpStatus.PAYLOAD_TOO_LARGE.value())
            .build();
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(response);
        }

        @ExceptionHandler({MultipartException.class, MissingServletRequestPartException.class})
        public ResponseEntity<ErrorResponse> handleMultipartException(
            Exception ex, WebRequest request) {
        ErrorResponse response = ErrorResponse.builder()
            .errorCode("BAD_REQUEST")
            .message("Requete multipart invalide ou fichier manquant")
            .messageKey("error.bad_request")
            .timestamp(LocalDateTime.now())
            .path(request.getDescription(false).replace("uri=", ""))
            .statusCode(HttpStatus.BAD_REQUEST.value())
            .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(
            ResourceNotFoundException ex, WebRequest request) {
        ErrorResponse response = ErrorResponse.builder()
                .errorCode("NOT_FOUND")
                .message(ex.getMessage())
                .messageKey("error.not_found")
                .timestamp(LocalDateTime.now())
                .path(request.getDescription(false).replace("uri=", ""))
                .statusCode(HttpStatus.NOT_FOUND.value())
                .build();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(UnsupportedOperationException.class)
    public ResponseEntity<ErrorResponse> handleUnsupportedOperation(
            UnsupportedOperationException ex, WebRequest request) {
        ErrorResponse response = ErrorResponse.builder()
                .errorCode("NOT_IMPLEMENTED")
                .message(ex.getMessage())
                .messageKey("error.not_implemented")
                .timestamp(LocalDateTime.now())
                .path(request.getDescription(false).replace("uri=", ""))
                .statusCode(HttpStatus.NOT_IMPLEMENTED.value())
                .build();
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body(response);
    }

    @ExceptionHandler(PermissionDeniedException.class)
    public ResponseEntity<ErrorResponse> handlePermissionDenied(
            PermissionDeniedException ex, WebRequest request) {
        return buildErrorResponse(ex, HttpStatus.FORBIDDEN, request);
    }

    @ExceptionHandler(AuthDomainException.class)
    public ResponseEntity<ErrorResponse> handleAuthDomainException(
            AuthDomainException ex, WebRequest request) {
        return buildErrorResponse(ex, HttpStatus.BAD_REQUEST, request);
    }

    @ExceptionHandler({AuthorizationDeniedException.class, AccessDeniedException.class})
    public ResponseEntity<ErrorResponse> handleAccessDenied(
            Exception ex, WebRequest request) {
        markAuditFailure(request, ex instanceof AuthorizationDeniedException ? "AUTHORIZATION_DENIED" : "ACCESS_DENIED");
        ErrorResponse response = ErrorResponse.builder()
                .errorCode("FORBIDDEN")
                .message("Acces refuse")
                .messageKey("error.forbidden")
                .timestamp(LocalDateTime.now())
                .path(request.getDescription(false).replace("uri=", ""))
                .statusCode(HttpStatus.FORBIDDEN.value())
                .build();
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex, WebRequest request) {
        log.error("Unhandled exception", ex);
        markAuditFailure(request, "INTERNAL_SERVER_ERROR");
        ErrorResponse response = ErrorResponse.builder()
                .errorCode("INTERNAL_SERVER_ERROR")
                .message("Une erreur interne s'est produite")
                .messageKey("error.internal_server_error")
                .timestamp(LocalDateTime.now())
                .path(request.getDescription(false).replace("uri=", ""))
                .statusCode(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    private ResponseEntity<ErrorResponse> buildErrorResponse(
            AuthDomainException ex, HttpStatus status, WebRequest request) {
        markAuditFailure(request, ex.getErrorCode());
        ErrorResponse response = buildErrorResponseBase(ex, status, request);
        return ResponseEntity.status(status).body(response);
    }

    private ErrorResponse buildErrorResponseBase(
            AuthDomainException ex, HttpStatus status, WebRequest request) {
        return ErrorResponse.builder()
                .errorCode(ex.getErrorCode())
                .message(ex.getMessage())
                .messageKey(ex.getMessageKey())
                .timestamp(LocalDateTime.now())
                .path(request.getDescription(false).replace("uri=", ""))
                .statusCode(status.value())
                .build();
    }

    private void markAuditFailure(WebRequest request, String reasonCode) {
        if (request instanceof ServletWebRequest servletWebRequest) {
            servletWebRequest.getRequest().setAttribute("audit.outcome", "FAILURE");
            servletWebRequest.getRequest().setAttribute("audit.reasonCode", reasonCode);
        }
    }
}
