import type { Blueprint } from "../../../data/schemas/blueprint";
import type { CycleAbilityConfig } from "../../../data/schemas/abilities/cycle";
import { compileScalableValue } from "../utils/scalableCompiler";
import { createCycleRule } from "./cycleCompiler.rules";
import { appendRuleConditions } from "../conditions/appendRuleConditions";
import type { BehaviorRule } from "../../../data/schemas/behavior";

const DEPLETION_CONDITION = {
    id: "is_depleted",
    sortKey: "1",
    tokens: [
        { t: "ref" as const, v: "self.state.is_depleted.value" },
        { t: "op" as const, v: "==" },
        { t: "val" as const, v: 0 as string | number },
    ],
};

const normalizeScale = (value?: {
    base?: number;
    perBody?: number;
    multPerBody?: number;
}) => ({
    base: value?.base ?? 0,
    perBody: value?.perBody ?? 0,
    multPerBody: value?.multPerBody ?? 0,
});

export const compileAccumulation = (
    draft: Blueprint,
    config: CycleAbilityConfig,
): void => {
    const components = draft.components;
    const accumulationParts: string[] = [];
    const inputs = config.inputs ?? {};

    for (const [attr, scaleConfig] of Object.entries(inputs)) {
        if (!scaleConfig) continue;
        const scale = normalizeScale(scaleConfig);
        compileScalableValue(
            draft,
            scale,
            `self.powerSink.baseDemand.${attr}`,
            `demand_${attr}_scaler`,
        );
        compileScalableValue(
            draft,
            scale,
            `self.powerSink.maxDemand.${attr}`,
            `demand_max_${attr}_scaler`,
        );
        accumulationParts.push(`self.powerSink.allocatedDraw.${attr}`);
    }

    if (accumulationParts.length === 0) return;

    const expression = `(${accumulationParts.join(" + ")}) * global.dt_s`;
    components.behavior ??= { rules: [] };
    components.behavior.rules ??= [];
    const cycleRule = createCycleRule(expression);
    if (config.oneOff === true) {
        cycleRule.conditions.push(
            DEPLETION_CONDITION as BehaviorRule["conditions"][number],
        );
    }
    appendRuleConditions(
        cycleRule,
        config.conditions ?? [],
        `${draft.id}:cycle`,
    );
    components.behavior.rules.push(cycleRule);
};

