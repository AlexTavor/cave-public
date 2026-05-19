import type { Blueprint } from "../../../data/schemas/blueprint";
import type { EditorAbilities } from "../../../data/schemas/abilities";
import type { ModuleCartridge } from "../../../data/schemas/module";
import { ModuleCartridgeSchema } from "../../../data/schemas/module";
import {
    sanitizeConditionsInList,
    sanitizeConditionsInCycle,
} from "./moduleStore.conditionSanitizer";
import { sanitizeDraft } from "./moduleStore.abilitySanitizer.draft";
import { sanitizeTriggeredActions } from "./moduleStore.abilitySanitizer.triggeredActions";
import { sanitizeUpdater } from "./moduleStore.abilitySanitizer.updater";

type AbilityType = keyof EditorAbilities;
type AbilitySanitizeResult = {
    abilities: EditorAbilities;
    removed: number;
    conditionsRemoved: number;
};
type AbilitySanitizer = (abilities: EditorAbilities) => AbilitySanitizeResult;

const isValidResource = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;

const sanitizeAbilityList = <T extends { resource: string }>(
    list: T[] | undefined,
): { list: T[] | undefined; removed: number } => {
    if (!Array.isArray(list)) return { list, removed: 0 };
    const valid = list.filter((entry) => isValidResource(entry.resource));
    return {
        list: valid.length ? valid : undefined,
        removed: list.length - valid.length,
    };
};

const isValidConversionList = (list: unknown): list is { resource: string }[] =>
    Array.isArray(list) && list.every((item) => isValidResource(item.resource));

const sanitizeConversionList = (
    list: EditorAbilities["conversion"],
): { list: EditorAbilities["conversion"]; removed: number } => {
    if (!Array.isArray(list)) return { list, removed: 0 };
    const valid = list.filter(
        (entry) =>
            isValidConversionList(entry.inputs) &&
            isValidConversionList(entry.outputs),
    );
    return {
        list: valid.length ? valid : undefined,
        removed: list.length - valid.length,
    };
};

const sanitizeStorageAbility = (abilities: EditorAbilities): AbilitySanitizeResult => {
    const result = sanitizeAbilityList(abilities.storage);
    return { abilities: { ...abilities, storage: result.list }, removed: result.removed, conditionsRemoved: 0 };
};

const sanitizeProductionAbility = (abilities: EditorAbilities): AbilitySanitizeResult => {
    const result = sanitizeAbilityList(abilities.production);
    const condResult = sanitizeConditionsInList(result.list);
    return {
        abilities: { ...abilities, production: condResult.list ?? result.list },
        removed: result.removed,
        conditionsRemoved: condResult.removed,
    };
};

const sanitizeUpkeepAbility = (abilities: EditorAbilities): AbilitySanitizeResult => {
    const result = sanitizeAbilityList(abilities.upkeep);
    return { abilities: { ...abilities, upkeep: result.list }, removed: result.removed, conditionsRemoved: 0 };
};

const sanitizeConversionAbility = (abilities: EditorAbilities): AbilitySanitizeResult => {
    const result = sanitizeConversionList(abilities.conversion);
    const condResult = sanitizeConditionsInList(result.list);
    return {
        abilities: { ...abilities, conversion: condResult.list ?? result.list },
        removed: result.removed,
        conditionsRemoved: condResult.removed,
    };
};

const sanitizeDraftAbility = (abilities: EditorAbilities): AbilitySanitizeResult => {
    const result = sanitizeDraft(abilities);
    return {
        abilities: { ...abilities, draft: result.draft },
        removed: result.removed,
        conditionsRemoved: result.conditionsRemoved,
    };
};

const sanitizeTriggeredActionsAbility = (abilities: EditorAbilities): AbilitySanitizeResult => {
    const result = sanitizeTriggeredActions(abilities);
    return {
        abilities: { ...abilities, triggeredActions: result.triggeredActions },
        removed: result.removed,
        conditionsRemoved: result.conditionsRemoved,
    };
};

const sanitizeUpdaterAbility = (abilities: EditorAbilities): AbilitySanitizeResult => {
    const result = sanitizeUpdater(abilities);
    return {
        abilities: { ...abilities, updater: result.updater },
        removed: result.removed,
        conditionsRemoved: result.conditionsRemoved,
    };
};

const sanitizeSpawnerAbility = (abilities: EditorAbilities): AbilitySanitizeResult => {
    const condResult = sanitizeConditionsInList(abilities.spawner);
    return {
        abilities: { ...abilities, spawner: condResult.list ?? abilities.spawner },
        removed: 0,
        conditionsRemoved: condResult.removed,
    };
};

const sanitizeCycleAbility = (abilities: EditorAbilities): AbilitySanitizeResult => {
    const condResult = sanitizeConditionsInCycle(abilities.cycle);
    return {
        abilities: { ...abilities, cycle: condResult.cycle ?? abilities.cycle },
        removed: 0,
        conditionsRemoved: condResult.removed,
    };
};

const abilitySanitizers: Partial<Record<AbilityType, AbilitySanitizer>> = {
    storage: sanitizeStorageAbility,
    production: sanitizeProductionAbility,
    upkeep: sanitizeUpkeepAbility,
    conversion: sanitizeConversionAbility,
    draft: sanitizeDraftAbility,
    triggeredActions: sanitizeTriggeredActionsAbility,
    updater: sanitizeUpdaterAbility,
    spawner: sanitizeSpawnerAbility,
    cycle: sanitizeCycleAbility,
};

const runAbilitySanitizers = (abilities: EditorAbilities): AbilitySanitizeResult =>
    Object.values(abilitySanitizers).reduce<AbilitySanitizeResult>(
        (acc, sanitize) => {
            const result = sanitize(acc.abilities);
            return {
                abilities: result.abilities,
                removed: acc.removed + result.removed,
                conditionsRemoved: acc.conditionsRemoved + result.conditionsRemoved,
            };
        },
        { abilities, removed: 0, conditionsRemoved: 0 },
    );

export const sanitizeBlueprintAbilities = (blueprint: Blueprint) => {
    const abilities = blueprint._editor?.abilities;
    if (!abilities) return { blueprint, removed: 0, conditionsRemoved: 0 };

    const { abilities: sanitizedAbilities, removed, conditionsRemoved } =
        runAbilitySanitizers(abilities);

    if (removed === 0 && conditionsRemoved === 0) {
        return { blueprint, removed, conditionsRemoved };
    }

    return {
        blueprint: {
            ...blueprint,
            _editor: {
                ...blueprint._editor,
                abilities: sanitizedAbilities,
            },
        },
        removed,
        conditionsRemoved,
    };
};

export const sanitizeModuleAbilities = (module: ModuleCartridge) => {
    let removed = 0;
    let conditionsRemoved = 0;
    const blueprints = Object.fromEntries(
        Object.entries(module.blueprints).map(([id, blueprint]) => {
            const result = sanitizeBlueprintAbilities(blueprint);
            removed += result.removed;
            conditionsRemoved += result.conditionsRemoved;
            return [id, result.blueprint];
        }),
    );

    if (removed === 0 && conditionsRemoved === 0) {
        return { module, removed, conditionsRemoved };
    }

    return {
        module: ModuleCartridgeSchema.parse({ ...module, blueprints }),
        removed,
        conditionsRemoved,
    };
};

