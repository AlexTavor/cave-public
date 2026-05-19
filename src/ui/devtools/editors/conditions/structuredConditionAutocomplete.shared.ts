const WORLD_FACT_TYPES = new Set([
    "elapsed_real_seconds",
    "elapsed_game_seconds",
    "run_number",
    "body_selector_open",
    "processing_ongoing",
    "active_bodies",
    "purge_began",
]);
const TUTORIAL_WORLD_STATE_KEYS = [
    "cave_tut_throttle_seen",
    "cave_tut_time_controls_seen",
];

export const CAVE_STATUS_KEYS = ["food", "heat"];
export const STRUCTURED_WORLD_STATE_KEYS = [
    "food",
    "heat",
    ...TUTORIAL_WORLD_STATE_KEYS,
];

export const collectTags = (blueprints: Record<string, { tags?: string[] }>) =>
    Object.values(blueprints).flatMap((blueprint) =>
        Array.isArray(blueprint?.tags) ? blueprint.tags : [],
    );

export const uniqueSorted = (values: string[]) =>
    [...new Set(values)].sort((left, right) => left.localeCompare(right));

export const resolveStructuredFactAboutSuggestions = (
    factType: string,
    blueprintIds: string[],
    tutorialIds: string[] = [],
    draftOptionIds: string[] = [],
    draftPoolIds: string[] = [],
    understandingIds: string[] = [],
) => {
    if (factType === "cave_status") return CAVE_STATUS_KEYS;
    if (WORLD_FACT_TYPES.has(factType)) return ["world"];
    if (factType === "tutorial_completed") return tutorialIds;
    if (factType === "draft_opened") return draftPoolIds;
    if (factType === "draft_completed") return draftOptionIds;
    if (factType === "understanding_owned") return understandingIds;
    return blueprintIds;
};
