import type { Blueprint } from "../../../data/schemas/blueprint";
import type { CycleAbilityConfig } from "../../../data/schemas/abilities/cycle";
import { findCycleCostRules } from "./cycleResourceCostCompilerUtils";
import { compileCycleCostGroup } from "./cycleResourceCostCompileGroup";
import {
    compileCycleCostRow,
    type CostGroup,
} from "./cycleResourceCostCompileRow";

const INPUT_ATTRIBUTES = ["body", "mind", "social"] as const;

export const cycleResourceCostCompiler = (
    draft: Blueprint,
    config: CycleAbilityConfig,
): void => {
    const components = (draft.components ??= {} as Blueprint["components"]);
    components.state ??= {};
    components.passiveEffects ??= [];
    components.behavior ??= { rules: [] };
    const groups = new Map<string, CostGroup>();
    const rules = findCycleCostRules(draft);
    const gatedAttributes = INPUT_ATTRIBUTES.filter(
        (attribute) => config.inputs?.[attribute] !== undefined,
    );
    for (const [index, cost] of (config.resourceCosts ?? []).entries()) {
        compileCycleCostRow(draft, cost, index, groups);
    }
    for (const [resource, group] of groups) {
        compileCycleCostGroup(draft, resource, group, rules, gatedAttributes);
    }
};
