package com.aerixa.app.application.candidates.security;

import java.util.LinkedHashSet;
import java.util.Set;

public final class CandidatesPermissions {

    private CandidatesPermissions() {
    }

    public static final String CANDIDATES_CREATE = "candidates:create";
    public static final String CANDIDATES_READ = "candidates:read";
    public static final String CANDIDATES_LIST = "candidates:list";
    public static final String CANDIDATES_UPDATE = "candidates:update";
    public static final String CANDIDATES_DELETE = "candidates:delete";
    public static final String CANDIDATES_HARD_DELETE = "candidates:hard_delete";
    public static final String CANDIDATES_ACTIVATE = "candidates:activate";
    public static final String CANDIDATES_DEACTIVATE = "candidates:deactivate";
    public static final String CANDIDATES_EXPORT = "candidates:export";
    public static final String CANDIDATES_IMPORT = "candidates:import";

    public static final String CANDIDATE_APPLICATIONS_CREATE = "candidate_applications:create";
    public static final String CANDIDATE_APPLICATIONS_READ = "candidate_applications:read";
    public static final String CANDIDATE_APPLICATIONS_LIST = "candidate_applications:list";
    public static final String CANDIDATE_APPLICATIONS_TRANSITION = "candidate_applications:transition";
    public static final String CANDIDATE_APPLICATIONS_HISTORY = "candidate_applications:history";

    public static final String CANDIDATE_NOTES_CREATE = "candidate_notes:create";
    public static final String CANDIDATE_NOTES_LIST = "candidate_notes:list";

    private static final Set<String> ALL = Set.copyOf(new LinkedHashSet<>(Set.of(
            CANDIDATES_CREATE,
            CANDIDATES_READ,
            CANDIDATES_LIST,
            CANDIDATES_UPDATE,
            CANDIDATES_DELETE,
            CANDIDATES_HARD_DELETE,
            CANDIDATES_ACTIVATE,
            CANDIDATES_DEACTIVATE,
            CANDIDATES_EXPORT,
            CANDIDATES_IMPORT,
            CANDIDATE_APPLICATIONS_CREATE,
            CANDIDATE_APPLICATIONS_READ,
            CANDIDATE_APPLICATIONS_LIST,
            CANDIDATE_APPLICATIONS_TRANSITION,
            CANDIDATE_APPLICATIONS_HISTORY,
            CANDIDATE_NOTES_CREATE,
            CANDIDATE_NOTES_LIST
    )));

    public static Set<String> all() {
        return ALL;
    }

    public static boolean isKnown(String permission) {
        return permission != null && ALL.contains(permission);
    }
}
