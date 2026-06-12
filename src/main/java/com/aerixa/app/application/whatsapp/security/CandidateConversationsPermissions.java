package com.aerixa.app.application.whatsapp.security;

import java.util.LinkedHashSet;
import java.util.Set;

public final class CandidateConversationsPermissions {

    private CandidateConversationsPermissions() {
    }

    public static final String CANDIDATE_CONVERSATIONS_READ = "candidate_conversations:read";
    public static final String CANDIDATE_CONVERSATIONS_LIST = "candidate_conversations:list";
    public static final String CANDIDATE_CONVERSATIONS_SEND_MESSAGE = "candidate_conversations:send_message";

    private static final Set<String> ALL = Set.copyOf(new LinkedHashSet<>(Set.of(
            CANDIDATE_CONVERSATIONS_READ,
            CANDIDATE_CONVERSATIONS_LIST,
            CANDIDATE_CONVERSATIONS_SEND_MESSAGE
    )));

    public static Set<String> all() {
        return ALL;
    }

    public static boolean isKnown(String permission) {
        return permission != null && ALL.contains(permission);
    }
}
