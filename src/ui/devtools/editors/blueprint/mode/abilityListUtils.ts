import type { EditorAbilities } from "../../../../../data/schemas/abilities";
import type { AbilityKey } from "./useDesignerAbilities";

export const buildStorageKey = (
    entry: NonNullable<EditorAbilities["storage"]>[number],
): string =>
    `storage-${entry.resource}-${entry.capacity?.base}-${entry.capacity?.perBody}-${entry.entropy?.base}-${entry.entropy?.perBody}-${entry.isDefault}-${entry.visible}`;

export const buildProductionKey = (
    entry: NonNullable<EditorAbilities["production"]>[number],
): string => `production-${entry.id}`;

export const buildConversionKey = (
    entry: NonNullable<EditorAbilities["conversion"]>[number],
): string =>
    `conversion-${entry.id ?? "default"}-${(entry.inputs ?? []).length}-${(entry.outputs ?? []).length}-${entry.resetCycle !== false}`;

export const buildUpkeepKey = (
    entry: NonNullable<EditorAbilities["upkeep"]>[number],
): string =>
    `upkeep-${entry.resource}-${entry.rate?.base}-${entry.rate?.perBody}-${entry.failureTrait}-${entry.autoRequest}`;

export const buildSpawnerKey = (
    entry: NonNullable<EditorAbilities["spawner"]>[number],
): string => `spawner-${entry.id}`;

export const buildSamplerKey = (
    entry: NonNullable<EditorAbilities["sampler"]>[number],
): string => `sampler-${entry.id}`;

export const buildDraftKey = (
    entry: NonNullable<EditorAbilities["draft"]>[number],
): string => `draft-${entry.id}`;

export const buildTriggeredActionsKey = (
    entry: NonNullable<EditorAbilities["triggeredActions"]>[number],
): string => `triggered-actions-${entry.id}`;

export const buildUpdaterKey = (
    entry: NonNullable<EditorAbilities["updater"]>[number],
): string => `updater-${entry.id}`;

export const buildNotificationKey = (
    entry: NonNullable<EditorAbilities["notifications"]>[number],
    index: number,
): string => `notification-${index}-${entry.id}`;

export const buildUnifiedBlueprintKey = (
    entry: NonNullable<EditorAbilities["unifiedBlueprints"]>[number],
    index: number,
): string =>
    `unified-blueprint-${index}-${entry.tag}-${entry.spawnWhenPeerSpawns}`;

export const abilityLabels: Record<AbilityKey, string> = {
    cycle: "Cycle",
    storage: "Storage",
    production: "Production",
    injection: "Injection",
    conversion: "Conversion",
    upkeep: "Upkeep",
    assignment: "Assignment",
    spawner: "Spawner",
    sampler: "Sampler",
    body: "Body",
    passport: "Passport",
    worldPresence: "World Presence",
    draft: "Draft",
    updater: "Updater",
    triggeredActions: "Triggered Actions",
    notifications: "Notifications",
    conditionalActivation: "Conditional Activation",
    unifiedBlueprints: "Unified Blueprints",
};

