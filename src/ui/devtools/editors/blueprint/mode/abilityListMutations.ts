import type { EditorAbilities } from "../../../../../data/schemas/abilities";
import { normalizeConditionalActivationConfigs } from "../../../../../data/schemas/abilities/conditionalActivation";
import {
    createConditionalActivationAbilityDraft,
    createConversionAbilityDraft,
    createProductionAbilityDraft,
    createStorageAbilityDraft,
    createUpkeepAbilityDraft,
    createSpawnerAbilityDraft,
    createSamplerAbilityDraft,
    createDraftAbilityDraft,
    createTriggeredActionsAbilityDraft,
    createUpdaterAbilityDraft,
    createNotificationAbilityDraft,
    createUnifiedBlueprintMembershipDraft,
} from "./abilityDrafts";

export type ArrayAbilityKey =
    | "storage"
    | "production"
    | "conversion"
    | "upkeep"
    | "spawner"
    | "sampler"
    | "draft"
    | "triggeredActions"
    | "updater"
    | "conditionalActivation"
    | "notifications"
    | "unifiedBlueprints";

type ArrayAbilityItemMap = {
    storage: ReturnType<typeof createStorageAbilityDraft>;
    production: ReturnType<typeof createProductionAbilityDraft>;
    conversion: ReturnType<typeof createConversionAbilityDraft>;
    upkeep: ReturnType<typeof createUpkeepAbilityDraft>;
    spawner: ReturnType<typeof createSpawnerAbilityDraft>;
    sampler: ReturnType<typeof createSamplerAbilityDraft>;
    draft: ReturnType<typeof createDraftAbilityDraft>;
    triggeredActions: ReturnType<typeof createTriggeredActionsAbilityDraft>;
    updater: ReturnType<typeof createUpdaterAbilityDraft>;
    conditionalActivation: ReturnType<
        typeof createConditionalActivationAbilityDraft
    >;
    notifications: ReturnType<typeof createNotificationAbilityDraft>;
    unifiedBlueprints: ReturnType<typeof createUnifiedBlueprintMembershipDraft>;
};

const arrayAbilityFactories: {
    [K in ArrayAbilityKey]: () => ArrayAbilityItemMap[K];
} = {
    storage: createStorageAbilityDraft,
    production: createProductionAbilityDraft,
    conversion: createConversionAbilityDraft,
    upkeep: createUpkeepAbilityDraft,
    spawner: createSpawnerAbilityDraft,
    sampler: createSamplerAbilityDraft,
    draft: createDraftAbilityDraft,
    triggeredActions: createTriggeredActionsAbilityDraft,
    updater: createUpdaterAbilityDraft,
    conditionalActivation: createConditionalActivationAbilityDraft,
    notifications: createNotificationAbilityDraft,
    unifiedBlueprints: createUnifiedBlueprintMembershipDraft,
};

const pushConditionalActivationAbility = (
    abilities: EditorAbilities,
    nextItem: ArrayAbilityItemMap["conditionalActivation"],
) => {
    abilities.conditionalActivation = [
        ...normalizeConditionalActivationConfigs(
            abilities.conditionalActivation,
        ),
        nextItem,
    ] as EditorAbilities["conditionalActivation"];
};

const pushArrayAbility = <K extends ArrayAbilityKey>(
    abilities: EditorAbilities,
    ability: K,
    nextItem: ArrayAbilityItemMap[K],
): void => {
    if (ability === "conditionalActivation") {
        pushConditionalActivationAbility(
            abilities,
            nextItem as ArrayAbilityItemMap["conditionalActivation"],
        );
        return;
    }
    const existing = abilities[ability];
    if (Array.isArray(existing)) {
        (existing as ArrayAbilityItemMap[K][]).push(nextItem);
        return;
    }
    abilities[ability] = [nextItem] as EditorAbilities[K];
};

export const addArrayAbilityItem = (
    abilities: EditorAbilities,
    ability: ArrayAbilityKey,
): void => {
    const nextItem = arrayAbilityFactories[ability]();
    pushArrayAbility(abilities, ability, nextItem);
};

