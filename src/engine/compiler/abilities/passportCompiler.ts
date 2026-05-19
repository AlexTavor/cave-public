import type { Blueprint } from "../../../data/schemas/blueprint";
import {
    PASSPORT_PERMANENT_TAG,
    PASSPORT_NERVOUS_VEIN_TAG,
    type PassportAbilityConfig,
} from "../../../data/schemas/abilities/passport";

const syncReservedTag = (
    draft: Blueprint,
    tag: string,
    enabled: boolean | undefined,
): void => {
    const tags = (draft.tags ?? []).filter((entry) => entry !== tag);
    draft.tags = enabled ? [...tags, tag] : tags;
};

const compileParent = (config: PassportAbilityConfig) => {
    if (!config.parent) return undefined;
    return config.parent.kind === "entity_id"
        ? { kind: "entity_id" as const, entityId: config.parent.entityId }
        : { kind: "entity_tag" as const, tag: config.parent.tag };
};

export const passportCompiler = (
    draft: Blueprint,
    config: PassportAbilityConfig,
): void => {
    draft.components ??= {} as Blueprint["components"];
    const label = config.label ?? "Unknown";
    syncReservedTag(draft, PASSPORT_NERVOUS_VEIN_TAG, config.nervousVein);
    syncReservedTag(draft, PASSPORT_PERMANENT_TAG, config.permanent);
    draft.label = label;
    const isBodyBlueprint = draft.tags.includes("body");
    const displayKey = config.icon ?? draft.id;

    draft.components.display ??= {
        label,
        display_key: displayKey,
    };
    const display = draft.components.display;
    display.label = label;
    display.display_key = isBodyBlueprint ? "body_avatar" : displayKey;

    if (isBodyBlueprint && draft.components.body) {
        draft.components.body.passport = {
            ...draft.components.body.passport,
            portraitIcon: displayKey,
            glyphKey: config.glyphKey,
        };
    }
    if (!isBodyBlueprint) delete display.glyphKey;

    if (config.description) {
        display.description = config.description;
    }
    if (isBodyBlueprint && config.styleId) {
        display.style = config.styleId;
    } else {
        delete display.style;
    }

    const parent = compileParent(config);
    if (parent) draft.components.parent = parent;
    else delete draft.components.parent;
};

