import type { BehaviorRule } from "../../../../../data/schemas/behavior";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import type { AbilityEffectGroup } from "../ability-display/abilityDisplay.types";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import { resolveEntityBehavior } from "../selectionUtils";
import {
    buildDraftEffects,
    buildTransformGroup,
    ensureGroup,
} from "./jobAnalysis.effectBuilders";
import {
    buildConversionGroup,
    buildProductionEffects,
} from "./jobAnalysis.resourceGainEffects";

const relevantRule = (rule: BehaviorRule) =>
    /^sys_(produce_|convert_|draft_|cycle_transition$)/.test(rule.id);

export const resolveNextCycleGroups = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): AbilityEffectGroup[] => {
    const behavior = resolveEntityBehavior(entity, runtime) as
        | { rules?: BehaviorRule[] }
        | undefined;
    const rules = (behavior?.rules ?? [])
        .filter(relevantRule)
        .sort((left, right) => left.sortKey.localeCompare(right.sortKey));
    const groups: AbilityEffectGroup[] = [];

    for (const rule of rules) {
        if (rule.id.startsWith("sys_produce_")) {
            ensureGroup(groups, "production", "Production").effects.push(
                ...buildProductionEffects(entity, rule, runtime),
            );
            continue;
        }
        if (rule.id.startsWith("sys_convert_")) {
            const group = buildConversionGroup(entity, rule, runtime);
            if (group) groups.push(group);
            continue;
        }
        if (rule.id.startsWith("sys_draft_")) {
            ensureGroup(groups, "draft", "Draft").effects.push(
                ...buildDraftEffects(rule),
            );
            continue;
        }
        const group = buildTransformGroup(rule);
        if (group) groups.push(group);
    }

    return groups;
};
