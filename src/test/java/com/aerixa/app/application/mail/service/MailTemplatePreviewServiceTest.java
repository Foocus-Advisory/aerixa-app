package com.aerixa.app.application.mail.service;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MailTemplatePreviewServiceTest {

    private final MailTemplatePreviewService service = new MailTemplatePreviewService();

    @Test
    void renderTemplate_normalizesEscapedPlaceholdersAndNewLines() {
        String rendered = service.renderTemplate(
                "Bonjour $${USER_NAME},\\nSupport: $${SUPPORT_EMAIL}",
                Map.of(
                        "USER_NAME", "Josephine",
                        "SUPPORT_EMAIL", "support@aerixa-app.com"
                )
        );

        assertThat(rendered).isEqualTo("Bonjour Josephine,\nSupport: support@aerixa-app.com");
    }
}