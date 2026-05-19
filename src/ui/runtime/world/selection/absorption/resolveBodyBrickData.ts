import { readTraitIds } from "../../../../../game/systems/cave/caveMindReadUtils";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import {
    selectBodyAttributes,
    selectBodyFallbackIconId,
    selectBodyHabiti,
    selectBodyHealth,
    selectBodyLevel,
    selectBodyMaxHealth,
} from "../body/bodyCardSelectors";
import { resolveBodySelectionTargetId } from "../selectionUtils";
import { resolveBodyStatusIcon } from "../body/BodyStatusIcons";
import type { BodyBrickRenderData } from "./bodyBrickTypes";
import { readRuntimeKnownHabiti } from "../readRuntimeKnownHabiti";

const EMPTY_ATTRIBUTES = { body: 0, mind: 0, social: 0 } as const;

export const resolveBodyBrickData = (
    entityId: string,
    runtime: Runtime | null,
): BodyBrickRenderData | null => {
    const entity = runtime?.getEntity(entityId) ?? null;
    if (!runtime || !entity) return null;
    const knownHabiti = readRuntimeKnownHabiti(runtime);
    const habitusIds = selectBodyHabiti(entity) as string[];
    return {
        entityId: entity.id ?? "",
        subjectId: resolveBodySelectionTargetId(entity) ?? entity.id ?? "",
        fallbackIconId: selectBodyFallbackIconId(entity),
        liveLevel: selectBodyLevel(entity),
        attributes: selectBodyAttributes(entity) ?? EMPTY_ATTRIBUTES,
        displayHealth: Math.round(selectBodyHealth(entity)),
        displayMaxHealth: Math.round(selectBodyMaxHealth(entity)),
        hasUnownedHabiti: habitusIds.some((id) => !knownHabiti.includes(id)),
        statusIcons: readTraitIds(entity)
            .map((traitId) => ({
                traitId,
                iconId: resolveBodyStatusIcon(traitId),
            }))
            .filter(
                (entry): entry is { traitId: string; iconId: string } =>
                    !!entry.iconId,
            ),
    };
};
