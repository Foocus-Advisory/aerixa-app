package com.aerixa.app.application.whatsapp.security;

import java.util.LinkedHashSet;
import java.util.Set;

public final class WhatsappConfigPermissions {

    private WhatsappConfigPermissions() {
    }

    public static final String ESTABLISHMENT_WHATSAPP_CONFIG_READ = "establishment_whatsapp_config:read";
    public static final String ESTABLISHMENT_WHATSAPP_CONFIG_UPDATE = "establishment_whatsapp_config:update";

    private static final Set<String> ALL = Set.copyOf(new LinkedHashSet<>(Set.of(
            ESTABLISHMENT_WHATSAPP_CONFIG_READ,
            ESTABLISHMENT_WHATSAPP_CONFIG_UPDATE
    )));

    public static Set<String> all() {
        return ALL;
    }

    public static boolean isKnown(String permission) {
        return permission != null && ALL.contains(permission);
    }
}
