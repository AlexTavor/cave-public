import type { BehaviorRule } from "../../../../../data/schemas/behavior";
import type { LogicToken } from "../../../../../data/schemas/logic";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import {
    normalizeKey,
    resolveActionValue,
    resolveNumber,
} from "./jobAnalysis.utils";

const TICKS_PER_SECOND = 60;

const isGteOp = (op: string) => op === ">=" || op === "GTE";

const extractAccumulatorGate = (
    tokens: LogicToken[],
    entity: RuntimeEntity,
) => {
    for (let i = 1; i < tokens.length - 1; i += 1) {
        const opToken = tokens[i];
        if (opToken.t !== "op" || !isGteOp(opToken.v)) continue;
        const left = tokens[i - 1];
        const right = tokens[i + 1];
        if (left.t !== "ref") continue;
        const accumulatorKey = normalizeKey(left.v);
        if (right.t === "val") {
            return { accumulatorKey, threshold: right.v } as const;
        }
        if (right.t === "ref") {
            const threshold = resolveNumber(entity, right.v);
            if (threshold !== null) {
                return { accumulatorKey, threshold } as const;
            }
        }
    }
    return null;
};

export const findPacingRate = (
    entity: RuntimeEntity,
    rules: BehaviorRule[],
    accumulatorKey: string,
) => {
    for (const rule of rules) {
        for (const action of rule.actions ?? []) {
            if (action.type !== "MUTATE" || action.op !== "ADD") continue;
            if (normalizeKey(action.target) !== normalizeKey(accumulatorKey))
                continue;
            const value = resolveActionValue(entity, action.value);
            if (typeof value === "number") return value;
        }
    }
    return null;
};

export const calculateRuleFrequency = (
    entity: RuntimeEntity,
    rule: BehaviorRule,
    rules: BehaviorRule[],
    liveEfficiency: number,
) => {
    const conditions = rule.conditions ?? [];
    if (!conditions.length) return TICKS_PER_SECOND;
    for (const condition of conditions) {
        const gate = extractAccumulatorGate(condition.tokens ?? [], entity);
        if (!gate) continue;
        const baseRate = findPacingRate(entity, rules, gate.accumulatorKey);
        if (!baseRate || baseRate <= 0 || gate.threshold <= 0) return 0;
        const fillRate = baseRate * liveEfficiency;
        if (fillRate <= 0) return 0;
        return (fillRate / gate.threshold) * TICKS_PER_SECOND;
    }
    return 0;
};
