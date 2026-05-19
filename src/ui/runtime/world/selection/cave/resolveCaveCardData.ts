import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { resolveHabitiDisplayEntries } from "../../../../../game/habiti/resolveHabitiDisplayEntries";
import { resolveEffectiveCaveAttributes } from "../../../../../game/habiti/resolveEffectiveCaveAttributes";
import { resolveUnderstandingDisplayEntries } from "../../../../../game/understanding/resolveUnderstandingDisplayEntries";
import { resolveXpThreshold } from "../../../../../game/systems/body/progression";
import { analyzeEntityState } from "../entityAnalysis/entityAnalysis";
import {
    readHabitiIndex,
    readTraitIndex,
    readUnderstandingIndex,
} from "../selectionResolverRuntime";
import { readRuntimeKnownHabiti } from "../readRuntimeKnownHabiti";
import { resolveEntityLabel } from "../selectionUtils";
import type { CaveCardData } from "./caveCardTypes";

const selectLevel = (entity: any) => entity.cave?.progression?.level ?? 1;
const selectAttributes = (entity: any) =>
    entity.cave?.attributes ?? entity.body?.attributes;

export const resolveCaveCardData = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): CaveCardData => {
    const targetId = entity.id ?? "";
    const ownedHabiti = (entity as any).cave?.ownedHabiti ?? [];
    const ownedUnderstanding = (entity as any).cave?.ownedUnderstanding ?? [];
    const knownHabiti = readRuntimeKnownHabiti(runtime);
    const baseAttributes = selectAttributes(entity) ?? {
        body: 0,
        mind: 0,
        social: 0,
    };
    const analysis = analyzeEntityState(entity, readTraitIndex(runtime));
    const level = selectLevel(entity);
    return {
        label: resolveEntityLabel(entity),
        targetId,
        level,
        xpMax: resolveXpThreshold(Math.max(1, level)),
        attributes: resolveEffectiveCaveAttributes({
            baseAttributes,
            ownedHabiti,
            habitusIndex: readHabitiIndex(runtime),
            ownedUnderstanding,
            understandingIndex: readUnderstandingIndex(runtime),
        }),
        habiti: resolveHabitiDisplayEntries({
            ids: knownHabiti,
            ownedHabiti,
            habitusIndex: readHabitiIndex(runtime),
            mode: "cave",
        }),
        understanding: resolveUnderstandingDisplayEntries({
            ids: ownedUnderstanding,
            ownedUnderstanding,
            understandingIndex: readUnderstandingIndex(runtime),
        }),
        modifiers: analysis.modifiers,
        traits: analysis.traits,
    };
};
