package com.aerixa.app.infrastructure.whatsapp.controller;

import com.aerixa.app.application.whatsapp.service.WhatsappWebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/webhooks/whatsapp")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "WhatsappWebhook", description = "Webhook entrant WhatsApp Cloud API (Meta)")
public class WhatsappWebhookController {

    private final WhatsappWebhookService whatsappWebhookService;

    @GetMapping
    @Operation(summary = "Challenge de verification d'abonnement webhook Meta")
    public ResponseEntity<String> verify(@RequestParam("hub.mode") String mode,
                                          @RequestParam("hub.verify_token") String verifyToken,
                                          @RequestParam("hub.challenge") String challenge) {
        return whatsappWebhookService.verifySubscription(mode, verifyToken, challenge)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.FORBIDDEN).build());
    }

    @PostMapping
    @Operation(summary = "Reception des notifications WhatsApp (messages entrants, statuts de livraison)")
    public ResponseEntity<Void> receive(@RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
                                         @org.springframework.web.bind.annotation.RequestBody String rawBody) {
        if (!whatsappWebhookService.verifySignature(rawBody, signature)) {
            log.warn("Signature webhook WhatsApp invalide");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            whatsappWebhookService.processNotification(rawBody);
        } catch (RuntimeException ex) {
            log.error("Echec du traitement de la notification webhook WhatsApp", ex);
        }

        return ResponseEntity.ok().build();
    }
}
