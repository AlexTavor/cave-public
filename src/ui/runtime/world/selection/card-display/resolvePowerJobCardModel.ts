import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import type { PowerJobCardData } from "../job-card/jobCardTypes";
import { adaptAbilityBarsToCapsules } from "./adaptAbilityBarsToCapsules";
import { resolveAnchoredEffects } from "./resolveAnchoredEffects";
import type { CardSectionModel, SelectionCardModel } from "./cardDisplayTypes";
import {
    resolveNextCycleSections,
    resolveSuspiciousBadges,
} from "./resolvePowerJobCardModelDisplay";
import {
    resolveCycleSection,
    resolvePowerUsageSection,
} from "./resolvePowerJobCardModelHelpers";

export const resolvePowerJobCardModel = (
    data: PowerJobCardData,
    entity: RuntimeEntity,
    runtime: Runtime | null,
): SelectionCardModel => {
    const entityId = entity.id ?? "";
    const sections: CardSectionModel[] = [];
    const powerUsage = resolvePowerUsageSection(data, entityId);
    const cycleSection = resolveCycleSection(data, entityId);
    if (powerUsage) sections.push(powerUsage);
    if (cycleSection) sections.push(cycleSection);
    sections.push(
        ...resolveNextCycleSections(
            entity,
            runtime,
            data.analysis.nextCycleGroups,
        ),
    );
    if (data.storageModels.length) {
        sections.push({
            id: `${entityId}:storage`,
            layout: "column",
            density: "normal",
            capsules: adaptAbilityBarsToCapsules(data.storageModels),
        });
    }
    const traitEffects = resolveAnchoredEffects({
        modifiers: [],
        traits: data.traits,
        localTargets: [],
    }).residualEffects;
    if (traitEffects.length) {
        sections.push({
            id: `${entityId}:traits`,
            title: "Traits",
            layout: "wrap",
            density: "tight",
            capsules: traitEffects,
        });
    }
    return {
        id: `job:${entityId}`,
        entityId,
        title: { id: `${entityId}:title`, text: data.label },
        badges: resolveSuspiciousBadges(data, entityId),
        description: data.description
            ? { id: `${entityId}:description`, text: data.description }
            : undefined,
        conditionalNoticeEntityId: entityId,
        sections,
    };
};
