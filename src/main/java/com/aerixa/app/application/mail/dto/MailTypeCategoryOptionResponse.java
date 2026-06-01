package com.aerixa.app.application.mail.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MailTypeCategoryOptionResponse {
    private String value;
    private String module;
    private String action;
    private String defaultCode;
    private String label;
    private String description;
}
