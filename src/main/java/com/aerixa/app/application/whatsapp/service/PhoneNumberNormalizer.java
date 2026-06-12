package com.aerixa.app.application.whatsapp.service;

/**
 * Normalisation minimale d'un numero au format E.164 (ex: "+237 6XX XX XX XX" -> "+2376XXXXXXXX").
 * Conserve uniquement le prefixe "+" et les chiffres.
 */
public final class PhoneNumberNormalizer {

    private PhoneNumberNormalizer() {
    }

    public static String normalize(String rawPhoneNumber) {
        if (rawPhoneNumber == null) {
            return null;
        }
        String trimmed = rawPhoneNumber.trim();
        if (trimmed.isEmpty()) {
            return null;
        }

        StringBuilder normalized = new StringBuilder();
        for (int i = 0; i < trimmed.length(); i++) {
            char c = trimmed.charAt(i);
            if (Character.isDigit(c)) {
                normalized.append(c);
            } else if (c == '+' && normalized.isEmpty()) {
                normalized.append(c);
            }
        }

        if (normalized.isEmpty()) {
            return null;
        }
        if (normalized.charAt(0) != '+') {
            normalized.insert(0, '+');
        }
        return normalized.toString();
    }
}
