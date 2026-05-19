import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { PASSPORT_PERMANENT_TAG } from "../../../../../data/schemas/abilities/passport";
import { resolveHabitiDisplayEntries } from "../../../../../game/habiti/resolveHabitiDisplayEntries";
import { resolveXpThreshold } from "../../../../../game/systems/body/progression";
import { analyzeEntityState } from "../entityAnalysis/entityAnalysis";
import { readHabitiIndex, readTraitIndex } from "../selectionResolverRuntime";
import {
    isPassportPresentationHidden,
    resolveBodySelectionTargetId,
    resolveVisibleEntityDescription,
} from "../selectionUtils";
import {
    selectBodyAttributes,
    selectBodyBaseAttributes,
    selectBodyDisplayName,
    selectBodyFallbackIconId,
    selectBodyHabiti,
    selectBodyLevel,
    selectBodyXpRate,
} from "./bodyCardSelectors";
import type { BodyCardData } from "./bodyCardTypes";
import { readRuntimeKnownHabiti } from "../readRuntimeKnownHabiti";

const EMPTY_ATTRIBUTES = { body: 0, mind: 0, social: 0 };

export const resolveBodyCardData = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): BodyCardData | null => {
    const targetId = resolveBodySelectionTargetId(entity);
    if (!targetId) return null;
    const targetEntity = runtime?.getEntity(targetId) ?? entity;
    const level = selectBodyLevel(targetEntity);
    const attributes = selectBodyAttributes(targetEntity) ?? EMPTY_ATTRIBUTES;
    const habitusIndex = readHabitiIndex(runtime);
    const knownHabiti = readRuntimeKnownHabiti(runtime);
    const analysis = analyzeEntityState(targetEntity, readTraitIndex(runtime));
    return {
        subjectId: targetId,
        isPermanent:
            targetEntity.tags?.includes(PASSPORT_PERMANENT_TAG) ?? false,
        showIdentityTitle: !isPassportPresentationHidden(targetEntity, runtime),
        displayName: selectBodyDisplayName(targetEntity),
        description: resolveVisibleEntityDescription(targetEntity, runtime),
        fallbackIconId: selectBodyFallbackIconId(targetEntity),
        level,
        xpMax: resolveXpThreshold(Math.max(1, level)),
        xpRate: selectBodyXpRate(targetEntity),
        baseAttributes: selectBodyBaseAttributes(targetEntity) ?? attributes,
        attributes,
        modifiers: analysis.modifiers,
        traits: analysis.traits,
        habiti: resolveHabitiDisplayEntries({
            ids: selectBodyHabiti(targetEntity),
            ownedHabiti: knownHabiti,
            habitusIndex,
            mode: "body",
        }),
    };
};
