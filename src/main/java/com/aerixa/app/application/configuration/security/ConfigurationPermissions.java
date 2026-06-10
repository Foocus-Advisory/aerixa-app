package com.aerixa.app.application.configuration.security;

import java.util.LinkedHashSet;
import java.util.Set;

public final class ConfigurationPermissions {

    private ConfigurationPermissions() {
    }

    public static final String ESTABLISHMENTS_CREATE = "establishments:create";
    public static final String ESTABLISHMENTS_READ = "establishments:read";
    public static final String ESTABLISHMENTS_LIST = "establishments:list";
    public static final String ESTABLISHMENTS_UPDATE = "establishments:update";
    public static final String ESTABLISHMENTS_ACTIVATE = "establishments:activate";
    public static final String ESTABLISHMENTS_DEACTIVATE = "establishments:deactivate";
    public static final String ESTABLISHMENTS_DELETE = "establishments:delete";

    public static final String ENTRY_DIPLOMAS_CREATE = "entry_diplomas:create";
    public static final String ENTRY_DIPLOMAS_READ = "entry_diplomas:read";
    public static final String ENTRY_DIPLOMAS_LIST = "entry_diplomas:list";
    public static final String ENTRY_DIPLOMAS_UPDATE = "entry_diplomas:update";
    public static final String ENTRY_DIPLOMAS_DELETE = "entry_diplomas:delete";
    public static final String ENTRY_DIPLOMAS_HARD_DELETE = "entry_diplomas:hard_delete";
    public static final String ENTRY_DIPLOMAS_ACTIVATE = "entry_diplomas:activate";
    public static final String ENTRY_DIPLOMAS_DEACTIVATE = "entry_diplomas:deactivate";
    public static final String ENTRY_DIPLOMAS_EXPORT = "entry_diplomas:export";
    public static final String ENTRY_DIPLOMAS_IMPORT = "entry_diplomas:import";

    public static final String ACADEMIC_LEVELS_CREATE = "academic_levels:create";
    public static final String ACADEMIC_LEVELS_READ = "academic_levels:read";
    public static final String ACADEMIC_LEVELS_LIST = "academic_levels:list";
    public static final String ACADEMIC_LEVELS_UPDATE = "academic_levels:update";
    public static final String ACADEMIC_LEVELS_DELETE = "academic_levels:delete";
    public static final String ACADEMIC_LEVELS_HARD_DELETE = "academic_levels:hard_delete";
    public static final String ACADEMIC_LEVELS_ACTIVATE = "academic_levels:activate";
    public static final String ACADEMIC_LEVELS_DEACTIVATE = "academic_levels:deactivate";
    public static final String ACADEMIC_LEVELS_EXPORT = "academic_levels:export";
    public static final String ACADEMIC_LEVELS_IMPORT = "academic_levels:import";
    public static final String ACADEMIC_LEVELS_ATTACH_ENTRY_DIPLOMA = "academic_levels:attach_entry_diploma";
    public static final String ACADEMIC_LEVELS_DETACH_ENTRY_DIPLOMA = "academic_levels:detach_entry_diploma";

    public static final String PROGRAM_TRACKS_CREATE = "program_tracks:create";
    public static final String PROGRAM_TRACKS_READ = "program_tracks:read";
    public static final String PROGRAM_TRACKS_LIST = "program_tracks:list";
    public static final String PROGRAM_TRACKS_UPDATE = "program_tracks:update";
    public static final String PROGRAM_TRACKS_DELETE = "program_tracks:delete";
    public static final String PROGRAM_TRACKS_HARD_DELETE = "program_tracks:hard_delete";
    public static final String PROGRAM_TRACKS_ACTIVATE = "program_tracks:activate";
    public static final String PROGRAM_TRACKS_DEACTIVATE = "program_tracks:deactivate";
    public static final String PROGRAM_TRACKS_EXPORT = "program_tracks:export";
    public static final String PROGRAM_TRACKS_IMPORT = "program_tracks:import";

    public static final String PROGRAM_TRACK_LEVELS_CREATE = "program_track_levels:create";
    public static final String PROGRAM_TRACK_LEVELS_READ = "program_track_levels:read";
    public static final String PROGRAM_TRACK_LEVELS_LIST = "program_track_levels:list";
    public static final String PROGRAM_TRACK_LEVELS_UPDATE = "program_track_levels:update";
    public static final String PROGRAM_TRACK_LEVELS_DELETE = "program_track_levels:delete";
    public static final String PROGRAM_TRACK_LEVELS_ACTIVATE = "program_track_levels:activate";
    public static final String PROGRAM_TRACK_LEVELS_DEACTIVATE = "program_track_levels:deactivate";

    public static final String ACQUISITION_CHANNELS_CREATE = "acquisition_channels:create";
    public static final String ACQUISITION_CHANNELS_READ = "acquisition_channels:read";
    public static final String ACQUISITION_CHANNELS_LIST = "acquisition_channels:list";
    public static final String ACQUISITION_CHANNELS_UPDATE = "acquisition_channels:update";
    public static final String ACQUISITION_CHANNELS_DELETE = "acquisition_channels:delete";
    public static final String ACQUISITION_CHANNELS_HARD_DELETE = "acquisition_channels:hard_delete";
    public static final String ACQUISITION_CHANNELS_ACTIVATE = "acquisition_channels:activate";
    public static final String ACQUISITION_CHANNELS_DEACTIVATE = "acquisition_channels:deactivate";
    public static final String ACQUISITION_CHANNELS_EXPORT = "acquisition_channels:export";
    public static final String ACQUISITION_CHANNELS_IMPORT = "acquisition_channels:import";

    public static final String FUNNEL_STAGES_CREATE = "funnel_stages:create";
    public static final String FUNNEL_STAGES_READ = "funnel_stages:read";
    public static final String FUNNEL_STAGES_LIST = "funnel_stages:list";
    public static final String FUNNEL_STAGES_UPDATE = "funnel_stages:update";
    public static final String FUNNEL_STAGES_DELETE = "funnel_stages:delete";
    public static final String FUNNEL_STAGES_HARD_DELETE = "funnel_stages:hard_delete";
    public static final String FUNNEL_STAGES_ACTIVATE = "funnel_stages:activate";
    public static final String FUNNEL_STAGES_DEACTIVATE = "funnel_stages:deactivate";
    public static final String FUNNEL_STAGES_EXPORT = "funnel_stages:export";
    public static final String FUNNEL_STAGES_IMPORT = "funnel_stages:import";

    public static final String FUNNEL_STAGE_TRANSITIONS_CREATE = "funnel_stage_transitions:create";
    public static final String FUNNEL_STAGE_TRANSITIONS_READ = "funnel_stage_transitions:read";
    public static final String FUNNEL_STAGE_TRANSITIONS_LIST = "funnel_stage_transitions:list";
    public static final String FUNNEL_STAGE_TRANSITIONS_UPDATE = "funnel_stage_transitions:update";
    public static final String FUNNEL_STAGE_TRANSITIONS_DELETE = "funnel_stage_transitions:delete";
    public static final String FUNNEL_STAGE_TRANSITIONS_ACTIVATE = "funnel_stage_transitions:activate";
    public static final String FUNNEL_STAGE_TRANSITIONS_DEACTIVATE = "funnel_stage_transitions:deactivate";
    public static final String FUNNEL_STAGE_TRANSITIONS_HARD_DELETE = "funnel_stage_transitions:hard_delete";

    public static final String PIPELINE_VIEW_PREFERENCE_READ = "pipeline_view_preference:read";
    public static final String PIPELINE_VIEW_PREFERENCE_UPDATE = "pipeline_view_preference:update";

    private static final Set<String> ALL = Set.copyOf(new LinkedHashSet<>(Set.of(
            ESTABLISHMENTS_CREATE,
            ESTABLISHMENTS_READ,
            ESTABLISHMENTS_LIST,
            ESTABLISHMENTS_UPDATE,
            ESTABLISHMENTS_ACTIVATE,
            ESTABLISHMENTS_DEACTIVATE,
            ESTABLISHMENTS_DELETE,
            ENTRY_DIPLOMAS_CREATE,
            ENTRY_DIPLOMAS_READ,
            ENTRY_DIPLOMAS_LIST,
            ENTRY_DIPLOMAS_UPDATE,
            ENTRY_DIPLOMAS_DELETE,
            ENTRY_DIPLOMAS_HARD_DELETE,
            ENTRY_DIPLOMAS_ACTIVATE,
            ENTRY_DIPLOMAS_DEACTIVATE,
            ENTRY_DIPLOMAS_EXPORT,
            ENTRY_DIPLOMAS_IMPORT,
            ACADEMIC_LEVELS_CREATE,
            ACADEMIC_LEVELS_READ,
            ACADEMIC_LEVELS_LIST,
            ACADEMIC_LEVELS_UPDATE,
            ACADEMIC_LEVELS_DELETE,
            ACADEMIC_LEVELS_HARD_DELETE,
            ACADEMIC_LEVELS_ACTIVATE,
            ACADEMIC_LEVELS_DEACTIVATE,
            ACADEMIC_LEVELS_EXPORT,
            ACADEMIC_LEVELS_IMPORT,
            ACADEMIC_LEVELS_ATTACH_ENTRY_DIPLOMA,
            ACADEMIC_LEVELS_DETACH_ENTRY_DIPLOMA,
            PROGRAM_TRACKS_CREATE,
            PROGRAM_TRACKS_READ,
            PROGRAM_TRACKS_LIST,
            PROGRAM_TRACKS_UPDATE,
            PROGRAM_TRACKS_DELETE,
            PROGRAM_TRACKS_HARD_DELETE,
            PROGRAM_TRACKS_ACTIVATE,
            PROGRAM_TRACKS_DEACTIVATE,
            PROGRAM_TRACKS_EXPORT,
            PROGRAM_TRACKS_IMPORT,
            PROGRAM_TRACK_LEVELS_CREATE,
            PROGRAM_TRACK_LEVELS_READ,
            PROGRAM_TRACK_LEVELS_LIST,
            PROGRAM_TRACK_LEVELS_UPDATE,
            PROGRAM_TRACK_LEVELS_DELETE,
            PROGRAM_TRACK_LEVELS_ACTIVATE,
            PROGRAM_TRACK_LEVELS_DEACTIVATE,
            ACQUISITION_CHANNELS_CREATE,
            ACQUISITION_CHANNELS_READ,
            ACQUISITION_CHANNELS_LIST,
            ACQUISITION_CHANNELS_UPDATE,
            ACQUISITION_CHANNELS_DELETE,
            ACQUISITION_CHANNELS_HARD_DELETE,
            ACQUISITION_CHANNELS_ACTIVATE,
            ACQUISITION_CHANNELS_DEACTIVATE,
            ACQUISITION_CHANNELS_EXPORT,
            ACQUISITION_CHANNELS_IMPORT,
            FUNNEL_STAGES_CREATE,
            FUNNEL_STAGES_READ,
            FUNNEL_STAGES_LIST,
            FUNNEL_STAGES_UPDATE,
            FUNNEL_STAGES_DELETE,
            FUNNEL_STAGES_HARD_DELETE,
            FUNNEL_STAGES_ACTIVATE,
            FUNNEL_STAGES_DEACTIVATE,
            FUNNEL_STAGES_EXPORT,
            FUNNEL_STAGES_IMPORT,
            FUNNEL_STAGE_TRANSITIONS_CREATE,
            FUNNEL_STAGE_TRANSITIONS_READ,
            FUNNEL_STAGE_TRANSITIONS_LIST,
            FUNNEL_STAGE_TRANSITIONS_UPDATE,
            FUNNEL_STAGE_TRANSITIONS_DELETE,
            FUNNEL_STAGE_TRANSITIONS_ACTIVATE,
            FUNNEL_STAGE_TRANSITIONS_DEACTIVATE,
            FUNNEL_STAGE_TRANSITIONS_HARD_DELETE,
            PIPELINE_VIEW_PREFERENCE_READ,
            PIPELINE_VIEW_PREFERENCE_UPDATE
    )));

    public static Set<String> all() {
        return ALL;
    }

    public static boolean isKnown(String permission) {
        return permission != null && ALL.contains(permission);
    }
}
