import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { HabitiDisplayEntry } from "../../../../game/habiti/resolveHabitiDisplayEntries";
import type { AbilityBarModel } from "./ability-display/abilityDisplay.types";
import { entityTextBindingEqual } from "../entity-state-link/entityStateLinkTextRuntime";
import { analysisResultEqual } from "./entityAnalysis/analysisComparer";

export const resolveMatchingEntityIds = (
    runtime: Runtime | null,
    match: (entity: any) => boolean,
) =>
    (runtime?.getEntities?.() ?? [])
        .filter(match)
        .map((entity) => entity.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

export const stringArrayEqual = (left: string[], right: string[]) =>
    left.length === right.length &&
    left.every((value, index) => value === right[index]);

const stableStorageTooltipLines = (lines: string[]) =>
    lines.filter(
        (line) => !line.startsWith("Current: ") && !line.startsWith("Max: "),
    );

const storageTooltipEqual = (left: string[], right: string[]) =>
    stringArrayEqual(
        stableStorageTooltipLines(left),
        stableStorageTooltipLines(right),
    );

const storageValueEqual = (left: AbilityBarModel, right: AbilityBarModel) => {
    if ("valueText" in left || "valueText" in right)
        return (
            "valueText" in left &&
            "valueText" in right &&
            left.valueText === right.valueText
        );
    return entityTextBindingEqual(left.valueBinding, right.valueBinding);
};

export const habitiEntriesEqual = (
    left: HabitiDisplayEntry[],
    right: HabitiDisplayEntry[],
) =>
    left.length === right.length &&
    left.every((entry, index) => {
        const other = right[index];
        return (
            entry.id === other.id &&
            entry.label === other.label &&
            entry.description === other.description &&
            entry.summary === other.summary &&
            entry.isOwnedByCave === other.isOwnedByCave &&
            stringArrayEqual(entry.effectDescriptions, other.effectDescriptions)
        );
    });

export const storageModelsEqual = (
    left: AbilityBarModel[],
    right: AbilityBarModel[],
) =>
    left.length === right.length &&
    left.every((model, index) => {
        const other = right[index];
        return (
            model.id === other.id &&
            model.entityId === other.entityId &&
            model.valuePath === other.valuePath &&
            model.maxPath === other.maxPath &&
            model.maxValue === other.maxValue &&
            model.color === other.color &&
            model.iconId === other.iconId &&
            model.title === other.title &&
            model.titleMetaText === other.titleMetaText &&
            storageValueEqual(model, other) &&
            model.tooltipTitle === other.tooltipTitle &&
            model.height === other.height &&
            storageTooltipEqual(model.tooltipLines, other.tooltipLines)
        );
    });

export const modifierTraitDataEqual = (
    left: { modifiers: any[]; traits: any[] },
    right: { modifiers: any[]; traits: any[] },
) => analysisResultEqual(left, right);
