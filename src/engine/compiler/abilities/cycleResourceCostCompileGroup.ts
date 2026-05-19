import type { Blueprint } from "../../../data/schemas/blueprint";
import type { BehaviorRule } from "../../../data/schemas/behavior";
import { Op } from "../../../data/schemas/primitives";
import { ensureStateEntry } from "./conversionCompilerUtils";
import { appendCompiledResourceProgressBar } from "./resourceProgressBarCompiler";
import { appendCycleBar } from "./cycleCompilerBar";
import type { CostGroup } from "./cycleResourceCostCompileRow";
import {
    cycleCostRequestLimitKey,
    cycleCostRequestNeedKey,
    cycleCostRequestTimerKey,
    cycleCostTotalAmountKey,
} from "./cycleResourceCostKeys";
import {
    createCycleCostCondition,
    createCycleCostConsumeRule,
    createCycleCostPowerGateRule,
} from "./cycleResourceCostRuleFactories";
import { createCycleCostRequestRules } from "./cycleResourceCostRequestRules";

const resolveCostPath = (key: string) => `self.state.${key}.value`;

const buildCostGroupPassiveEffects = (
    resource: string,
    timerKey: string,
    needKey: string,
    limitKey: string,
    group: CostGroup,
    amountRef: string,
) => [
    { op: Op.SET, target: amountRef, value: 0 },
    ...group.amountRefs.map((source) => ({
        op: Op.ADD,
        target: amountRef,
        source,
    })),
    { op: Op.SET, target: `self.state.${resource}.max`, source: amountRef },
    { op: Op.ADD, target: resolveCostPath(timerKey), source: "global.dt_s" },
    { op: Op.SET, target: resolveCostPath(needKey), source: amountRef },
    { op: Op.SUB, target: resolveCostPath(needKey), source: resolveCostPath(resource) },
    {
        op: Op.SET,
        target: resolveCostPath(limitKey),
        value: group.requestPerSecondAtFullThrottle * group.requestCadenceSeconds,
    },
];

export const compileCycleCostGroup = (
    draft: Blueprint,
    resource: string,
    group: CostGroup,
    rules: BehaviorRule[],
    gatedAttributes: Array<"body" | "mind" | "social">,
): void => {
    ensureStateEntry(draft, resource);
    const totalKey = cycleCostTotalAmountKey(resource);
    const timerKey = cycleCostRequestTimerKey(resource);
    const needKey = cycleCostRequestNeedKey(resource);
    const limitKey = cycleCostRequestLimitKey(resource);
    [totalKey, timerKey, needKey, limitKey].forEach((key) =>
        ensureStateEntry(draft, key),
    );
    const components = draft.components;
    const state = components.state!;
    const entry = state[resource];
    entry.allowDeposit = true;
    entry.allowWithdraw ??= false;
    entry.max ??= 0;
    entry.priority = group.priority;
    const amountRef = resolveCostPath(totalKey);
    components.passiveEffects!.push(
        ...buildCostGroupPassiveEffects(
            resource,
            timerKey,
            needKey,
            limitKey,
            group,
            amountRef,
        ),
    );
    if (components.powerSink) {
        components.passiveEffects!.push({
            op: Op.MULT,
            target: resolveCostPath(limitKey),
            source: "self.powerSink.throttle",
        });
    }
    rules.forEach((rule, index) =>
        rule.conditions.push(
            createCycleCostCondition(resource, amountRef, index),
        ),
    );
    components.behavior!.rules.push(
        createCycleCostConsumeRule(resource, amountRef),
        ...createCycleCostRequestRules({
            resource,
            needRef: resolveCostPath(needKey),
            limitRef: resolveCostPath(limitKey),
            timerKey,
            requestCadenceSeconds: group.requestCadenceSeconds,
            hasSink: Boolean(components.powerSink),
        }),
    );
    if (gatedAttributes.length > 0) {
        components.behavior!.rules.push(
            createCycleCostPowerGateRule(resource, amountRef, gatedAttributes),
        );
    }
    if (!group.visible || !components.display) return;
    components.display.bars ??= [];
    appendCompiledResourceProgressBar({
        bars: components.display.bars,
        resource,
        maxKey: `state.${totalKey}.value`,
        color: group.barColorHex,
        label: resource,
        paletteColorKey: group.barPaletteColorKey,
        position: group.barPosition,
    });
    appendCycleBar(draft);
};
