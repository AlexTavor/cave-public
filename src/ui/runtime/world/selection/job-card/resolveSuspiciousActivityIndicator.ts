import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import {
    collectSuspiciousPurgeUpdaters,
    PURGE_PROGRESS_TARGET,
} from "../../../../../engine/compiler/abilities/suspiciousActivity";
import {
    isPassportPresentationHidden,
    resolveBlueprintById,
} from "../selectionUtils";
import { formatEffectAmount } from "../ability-display/abilityDisplay.utils";
import {
    readConfiguredSusDisplays,
    resolveDisplayRule,
} from "./suspiciousActivityIndicatorRules";
import { resolveActionValue } from "./jobAnalysis.utils";

export type SuspiciousActivityIndicatorModel = {
    text: string;
    color: string;
    tooltipTitle: string;
    tooltipLines: string[];
};

type SuspiciousEntry = {
    value: unknown;
    hasCycle: boolean;
    hasAssignment: boolean;
};

const formatTriggerLine = (hasCycle: boolean, hasAssignment: boolean) => {
    if (hasCycle && hasAssignment) {
        return "Triggers: cycle completion and assignment completion";
    }
    if (hasAssignment) return "Triggers: assignment completion";
    return "Triggers: cycle completion";
};

const readSuspiciousEntries = (blueprint: any): SuspiciousEntry[] => {
    const editor = blueprint?._editor?.abilities;
    if (editor) {
        return collectSuspiciousPurgeUpdaters(editor).map((updater) => ({
            value: updater.value,
            hasCycle: updater.triggers?.includes("cycle_complete") ?? false,
            hasAssignment:
                updater.triggers?.includes("assignment_complete") ?? false,
        }));
    }
    return (blueprint?.components?.behavior?.rules ?? []).flatMap(
        (rule: any) => {
            const ids = new Set(
                (rule.conditions ?? []).map((condition: any) => condition?.id),
            );
            return (rule.actions ?? [])
                .filter(
                    (action: any) =>
                        action?.type === "MUTATE" &&
                        action?.op === "ADD" &&
                        action?.target === PURGE_PROGRESS_TARGET,
                )
                .map((action: any) => ({
                    value: action.value,
                    hasCycle:
                        ids.has("cycle_complete") ||
                        ids.has("cycle_or_assignment_complete"),
                    hasAssignment:
                        ids.has("assignment_complete") ||
                        ids.has("cycle_or_assignment_complete"),
                }));
        },
    );
};

export const resolveSuspiciousActivityIndicator = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): SuspiciousActivityIndicatorModel | null => {
    if (isPassportPresentationHidden(entity, runtime)) return null;
    const blueprint = resolveBlueprintById(runtime, entity.blueprintId);
    const entries = readSuspiciousEntries(blueprint);
    if (entries.length === 0) return null;
    const totalAmount = entries.reduce((sum, entry) => {
        const resolved = resolveActionValue(entity, entry.value);
        return typeof resolved === "number" && resolved > 0
            ? sum + resolved
            : sum;
    }, 0);
    const rules = readConfiguredSusDisplays(runtime);
    const displayRule = resolveDisplayRule(totalAmount, rules);
    if (!displayRule) return null;
    const hasCycle = entries.some((entry) => entry.hasCycle);
    const hasAssignment = entries.some((entry) => entry.hasAssignment);
    return {
        text: displayRule.text,
        color: displayRule.color,
        tooltipTitle: "Suspicious Activity",
        tooltipLines: [
            "This activity advances Purge Progress when it completes.",
            formatTriggerLine(hasCycle, hasAssignment),
            ...(totalAmount > 0
                ? [`Purge Progress: +${formatEffectAmount(totalAmount)}`]
                : []),
        ],
    };
};
