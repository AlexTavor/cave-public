const LEGACY_DISPLAY_KEY_ALIASES: Record<string, string> = {
    resource_wood: "wood",
    resource_fire: "fire",
    resource_heat: "heat",
    resource_edibles: "edibles",
    resource_food: "food",
    resource_comfort: "comfort",
    resource_raw: "raw",
    activity_forest: "foraging",
    activity_lumber: "gatherwood",
    pool_icon: "absorption",
    status_exhausted: "attr_body",
    cave_bodies: "luretraveler",
};

export const normalizeLegacyDisplayKey = (input: string): string =>
    LEGACY_DISPLAY_KEY_ALIASES[input] ?? input;
