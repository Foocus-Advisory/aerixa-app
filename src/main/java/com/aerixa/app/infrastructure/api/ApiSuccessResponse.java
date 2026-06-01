package com.aerixa.app.infrastructure.api;

import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiSuccessResponse<T> {
    private boolean success;
    private String message;
    private LocalDateTime timestamp;
    private String path;
    private Integer statusCode;
    private T data;
}
