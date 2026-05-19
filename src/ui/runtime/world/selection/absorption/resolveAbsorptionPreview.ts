import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { resolveHabitiDisplayEntries } from "../../../../../game/habiti/resolveHabitiDisplayEntries";
import {
    readKnownHabiti,
    readPendingCarrierHabiti,
} from "../../../../../game/habiti/knownHabiti";
import { resolveOwnedCaveKnowledgeEffects } from "../../../../../game/habiti/resolveOwnedCaveKnowledgeEffects";
import { resolveResourceGainBonusBreakdown } from "../../../../../game/habiti/resolveResourceGainBonusBreakdown";
import { resolveBatchAbsorptionOutcome } from "../../../../../game/handlers/resolveAbsorptionHabitiOutcome";

const readOwnedUnderstanding = (entity: unknown) => {
    const ownedUnderstanding = (
        entity as { cave?: { ownedUnderstanding?: string[] } }
    )?.cave?.ownedUnderstanding;
    return Array.isArray(ownedUnderstanding) ? ownedUnderstanding : [];
};

const readHabitusIndex = (runtime: Runtime) =>
    (typeof runtime.getCartridge === "function"
        ? runtime.getCartridge().config?.habiti
        : {}) as Record<string, any>;

const readUnderstandingIndex = (runtime: Runtime) =>
    (typeof runtime.getCartridge === "function"
        ? runtime.getCartridge().config?.understanding
        : {}) as Record<string, any>;

const zeroBonuses = {
    absorptionXpConversionBonus: 0,
    resourceGainMultipliers: {},
};

export const resolveAbsorptionPreview = (input: {
    runtime: Runtime;
    stationEntity?: RuntimeEntity;
    bodyEntities: RuntimeEntity[];
}) => {
    const habitusIndex = readHabitusIndex(input.runtime);
    const understandingIndex = readUnderstandingIndex(input.runtime);
    const world = input.runtime.getEntity("sys_world");
    const entities =
        typeof input.runtime.getEntities === "function"
            ? input.runtime.getEntities()
            : [world, input.stationEntity, ...input.bodyEntities].filter(
                  Boolean,
              );
    const caveOwnedHabiti =
        (world as { cave?: { ownedHabiti?: string[] } } | undefined)?.cave
            ?.ownedHabiti ?? [];
    const cavePendingHabiti = readPendingCarrierHabiti(
        entities as RuntimeEntity[],
    );
    const caveKnownHabiti = readKnownHabiti(
        world as any,
        entities as RuntimeEntity[],
    );
    const caveOwnedUnderstanding = readOwnedUnderstanding(world);
    const station =
        input.stationEntity ?? ({ id: "sys_world" } as RuntimeEntity);
    const bonuses = resolveOwnedCaveKnowledgeEffects({
        ownedHabiti: caveOwnedHabiti,
        habitusIndex,
        ownedUnderstanding: caveOwnedUnderstanding,
        understandingIndex,
    });
    const baseOutcome = resolveBatchAbsorptionOutcome({
        station,
        bodyEntities: input.bodyEntities,
        knownHabiti: caveKnownHabiti,
        bonuses: zeroBonuses,
        habitusIndex,
    });
    const finalOutcome = resolveBatchAbsorptionOutcome({
        station,
        bodyEntities: input.bodyEntities,
        knownHabiti: caveKnownHabiti,
        bonuses,
        habitusIndex,
    });
    const baseTotals = new Map(
        baseOutcome.resources.map((item) => [item.resource, item.amount]),
    );
    const finalTotals = new Map(
        finalOutcome.resources.map((item) => [item.resource, item.amount]),
    );

    return {
        ...finalOutcome,
        resourceRows: [
            ...new Set([...baseTotals.keys(), ...finalTotals.keys()]),
        ]
            .sort((a, b) => a.localeCompare(b))
            .map((resource) => ({
                resource,
                baseAmount: baseTotals.get(resource) ?? 0,
                finalAmount: finalTotals.get(resource) ?? 0,
                breakdown: resolveResourceGainBonusBreakdown({
                    resource,
                    ownedHabiti: caveOwnedHabiti,
                    ownedUnderstanding: caveOwnedUnderstanding,
                    habitusIndex,
                    understandingIndex,
                }),
            }))
            .filter((item) => item.baseAmount > 0 || item.finalAmount > 0),
        newHabitiEntries: resolveHabitiDisplayEntries({
            ids: finalOutcome.newHabiti,
            ownedHabiti: caveOwnedHabiti,
            habitusIndex,
            mode: "cave",
        }),
        duplicateHabitiEntries: resolveHabitiDisplayEntries({
            ids: finalOutcome.duplicateHabiti,
            ownedHabiti: [...caveOwnedHabiti, ...cavePendingHabiti],
            habitusIndex,
            mode: "cave",
        }),
    };
};
