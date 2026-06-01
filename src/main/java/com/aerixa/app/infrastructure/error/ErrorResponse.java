package com.aerixa.app.infrastructure.error;

import lombok.*;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ErrorResponse {
    private String errorCode;
    private String message;
    private String messageKey;
    private LocalDateTime timestamp;
    private String path;
    private Integer statusCode;
    private Map<String, Object> details;
}
