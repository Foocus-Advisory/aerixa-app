package com.aerixa.app.application.mail.service;

import com.aerixa.app.application.mail.dto.MailTemplatePreviewRequest;
import com.aerixa.app.application.mail.dto.MailTemplatePreviewResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service de prévisualisation des templates de mail
 * Gère le remplacement des variables et la validation des templates
 */
@Service
@RequiredArgsConstructor
public class MailTemplatePreviewService {

    private static final Pattern VARIABLE_PATTERN = Pattern.compile("\\$\\{([A-Za-z0-9_]+)\\}");
    private static final String ESCAPED_PLACEHOLDER_PREFIX = "$${";

    /**
     * Prévisualise un template en remplaçant les variables par des valeurs de test
     */
    public MailTemplatePreviewResponse previewTemplate(MailTemplatePreviewRequest request) {
        Map<String, String> variables = request.getVariables() != null ? request.getVariables() : Map.of();

        String renderedSubject = renderTemplate(request.getSubject(), variables);
        String renderedHtml = renderTemplate(request.getHtmlContent(), variables);
        String renderedText = request.getTextContent() != null
                ? renderTemplate(request.getTextContent(), variables)
                : null;

        return MailTemplatePreviewResponse.builder()
                .subject(request.getSubject())
                .htmlContent(request.getHtmlContent())
                .textContent(request.getTextContent())
                .preview(buildPreview(renderedText, renderedHtml))
                .renderedHtml(renderedHtml)
                .renderedText(renderedText)
                .build();
    }

    private String buildPreview(String renderedText, String renderedHtml) {
        String source = (renderedText != null && !renderedText.isBlank())
                ? renderedText
                : (renderedHtml != null ? renderedHtml.replaceAll("<[^>]*>", " ") : "");

        String normalized = source.replaceAll("\\s+", " ").trim();
        if (normalized.length() <= 160) {
            return normalized;
        }
        return normalized.substring(0, 157) + "...";
    }

    /**
     * Remplace les variables d'un template avec les valeurs fournies
     * Format: ${VAR_NAME}
     *
     * @param template Le template contenant les variables
     * @param variables Map des variables à remplacer
     * @return Le template avec les variables remplacées
     */
    public String renderTemplate(String template, Map<String, String> variables) {
        if (template == null || template.isEmpty()) {
            return template;
        }

        String normalizedTemplate = normalizeTemplate(template);

        StringBuffer result = new StringBuffer();
        Matcher matcher = VARIABLE_PATTERN.matcher(normalizedTemplate);

        while (matcher.find()) {
            String varName = matcher.group(1);
            String value = variables.getOrDefault(varName, "${" + varName + "}");
            matcher.appendReplacement(result, Matcher.quoteReplacement(value));
        }

        matcher.appendTail(result);
        return result.toString();
    }

    private String normalizeTemplate(String template) {
        return template
                .replace(ESCAPED_PLACEHOLDER_PREFIX, "${")
                .replace("\\r\\n", "\n")
                .replace("\\n", "\n");
    }

    /**
     * Extrait les variables requises d'un template
     *
     * @param template Le template à analyser
     * @return Array des noms de variables trouvées
     */
    public String[] extractVariables(String template) {
        if (template == null || template.isEmpty()) {
            return new String[0];
        }

        java.util.Set<String> variables = new java.util.HashSet<>();
        Matcher matcher = VARIABLE_PATTERN.matcher(template);

        while (matcher.find()) {
            variables.add(matcher.group(1));
        }

        return variables.toArray(new String[0]);
    }

    /**
     * Valide qu'un template contient toutes les variables requises
     *
     * @param template Le template à valider
     * @param requiredVariables Variables requises
     * @return true si toutes les variables requises sont présentes
     */
    public boolean validateTemplate(String template, String[] requiredVariables) {
        if (template == null || requiredVariables == null || requiredVariables.length == 0) {
            return true;
        }

        String[] foundVariables = extractVariables(template);
        java.util.Set<String> foundSet = java.util.Set.of(foundVariables);

        for (String required : requiredVariables) {
            if (!foundSet.contains(required)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Détecte les variables inutilisées dans un template
     *
     * @param template Le template à analyser
     * @param expectedVariables Variables attendues
     * @return Array des variables non utilisées
     */
    public String[] findUnusedVariables(String template, String[] expectedVariables) {
        if (template == null || expectedVariables == null || expectedVariables.length == 0) {
            return new String[0];
        }

        String[] foundVariables = extractVariables(template);
        java.util.Set<String> foundSet = java.util.Set.of(foundVariables);
        java.util.Set<String> expectedSet = java.util.Set.of(expectedVariables);

        return expectedSet.stream()
                .filter(v -> !foundSet.contains(v))
                .toArray(String[]::new);
    }
}
