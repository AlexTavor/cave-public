import type { Blueprint } from "../../../data/schemas/blueprint";
import type { BodyAbilityConfig } from "../../../data/schemas/abilities/body";
import { BodyComponentSchema } from "../../../data/schemas/game/body";

export const bodyCompiler = (
    draft: Blueprint,
    config: BodyAbilityConfig,
): void => {
    const tags = Array.isArray(draft.tags) ? draft.tags : [];
    if (!tags.includes("body")) tags.push("body");
    draft.tags = tags;

    draft.components ??= {} as Blueprint["components"];
    const body = BodyComponentSchema.parse({
        xp: config.xp,
        xpRate: 1,
        level: config.level,
        health: config.health,
        maxHealth: config.health,
        baseAttributes: config.baseAttributes,
        attributes: { ...config.baseAttributes },
        traits: [],
        habiti: [],
        passport: {
            name: draft.label ?? "Unknown",
            description: "",
        },
    });
    draft.components.body = body;

    if (config.traits.length > 0) {
        draft.components.traits = config.traits.map((id) => ({ id }));
    }

    if (config.rules && config.rules.length > 0) {
        draft.components.behavior ??= { rules: [] };
        draft.components.behavior.rules ??= [];
        draft.components.behavior.rules.push(...config.rules);
    }
};

