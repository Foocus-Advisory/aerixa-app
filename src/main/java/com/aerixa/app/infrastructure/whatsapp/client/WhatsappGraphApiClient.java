package com.aerixa.app.infrastructure.whatsapp.client;

import com.aerixa.app.application.whatsapp.dto.WhatsappGraphSendResponse;
import com.aerixa.app.infrastructure.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * Client de l'API Graph Meta (WhatsApp Cloud API) pour l'envoi de messages sortants.
 */
@Component
@RequiredArgsConstructor
public class WhatsappGraphApiClient {

    private final AppProperties appProperties;

    /** Envoie un message texte libre. Retourne l'identifiant WhatsApp du message envoye. */
    public String sendTextMessage(String phoneNumberId, String accessToken, String toPhoneNumber, String text) {
        Map<String, Object> body = Map.of(
                "messaging_product", "whatsapp",
                "to", toPhoneNumber,
                "type", "text",
                "text", Map.of("body", text)
        );
        return send(phoneNumberId, accessToken, body);
    }

    /** Envoie un message template approuve (utilisable hors fenetre de 24h). */
    public String sendTemplateMessage(String phoneNumberId, String accessToken, String toPhoneNumber,
                                       String templateName, String languageCode) {
        Map<String, Object> body = Map.of(
                "messaging_product", "whatsapp",
                "to", toPhoneNumber,
                "type", "template",
                "template", Map.of(
                        "name", templateName,
                        "language", Map.of("code", languageCode)
                )
        );
        return send(phoneNumberId, accessToken, body);
    }

    private String send(String phoneNumberId, String accessToken, Map<String, Object> body) {
        WhatsappGraphSendResponse response = RestClient.builder().build()
                .post()
                .uri(resolveBaseUrl() + "/" + appProperties.getWhatsapp().getGraphApiVersion() + "/" + phoneNumberId + "/messages")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + accessToken)
                .body(body)
                .retrieve()
                .body(WhatsappGraphSendResponse.class);

        if (response == null || response.getMessages() == null || response.getMessages().isEmpty()) {
            throw new IllegalStateException("Reponse invalide de l'API Graph WhatsApp (aucun message renvoye)");
        }

        return response.getMessages().get(0).getId();
    }

    private String resolveBaseUrl() {
        String baseUrl = appProperties.getWhatsapp().getGraphApiBaseUrl();
        return baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }
}
