import type { RuntimeCommandMetadata } from "../commandMetadata";

export const UNIFIED_BLUEPRINT_SPAWN_METADATA_KEY =
    "unifiedBlueprintSpawnPlannedBlueprintIds";
export const UNIFIED_BLUEPRINT_KILL_METADATA_KEY =
    "unifiedBlueprintKillPlannedEntityIds";
export const SUPPRESS_UNIFIED_BLUEPRINT_SPAWNS_METADATA_KEY =
    "suppressUnifiedBlueprintPeerSpawns";

export type UnifiedBlueprintMemberships = Record<string, boolean>;

const readStringArray = (value: unknown): string[] =>
    Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === "string")
        : [];

export const readUnifiedBlueprintMemberships = (
    blueprint: unknown,
): UnifiedBlueprintMemberships => {
    const memberships =
        (
            blueprint as {
                _editor?: { abilities?: { unifiedBlueprints?: unknown[] } };
            }
        )?._editor?.abilities?.unifiedBlueprints ?? [];
    return memberships.reduce<UnifiedBlueprintMemberships>((result, entry) => {
        const tag =
            typeof (entry as { tag?: unknown }).tag === "string"
                ? (entry as { tag: string }).tag.trim()
                : "";
        if (!tag) return result;
        result[tag] =
            result[tag] ||
            (entry as { spawnWhenPeerSpawns?: unknown }).spawnWhenPeerSpawns ===
                true;
        return result;
    }, {});
};

export const hasUnifiedBlueprintSharedTag = (
    left: UnifiedBlueprintMemberships,
    right: UnifiedBlueprintMemberships,
): boolean => Object.keys(left).some((tag) => tag in right);

export const hasUnifiedBlueprintSpawnTrigger = (
    source: UnifiedBlueprintMemberships,
    peer: UnifiedBlueprintMemberships,
): boolean => Object.keys(source).some((tag) => peer[tag] === true);

export const seedUnifiedBlueprintSpawnPlan = (
    metadata: RuntimeCommandMetadata | undefined,
    sourceBlueprintId: string,
): string[] => [
    ...new Set([
        ...readStringArray(metadata?.[UNIFIED_BLUEPRINT_SPAWN_METADATA_KEY]),
        sourceBlueprintId,
    ]),
];

export const seedUnifiedBlueprintKillPlan = (
    metadata: RuntimeCommandMetadata | undefined,
    sourceEntityId: string,
): string[] => [
    ...new Set([
        ...readStringArray(metadata?.[UNIFIED_BLUEPRINT_KILL_METADATA_KEY]),
        sourceEntityId,
    ]),
];

export const shouldSuppressUnifiedBlueprintSpawns = (
    metadata: RuntimeCommandMetadata | undefined,
): boolean =>
    metadata?.[SUPPRESS_UNIFIED_BLUEPRINT_SPAWNS_METADATA_KEY] === true;
