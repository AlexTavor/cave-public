import { Op } from "../../../data/schemas/primitives";
import type { PassiveEffect } from "../../../data/schemas/components";
import type { Snapshot } from "../../../engine/runtime/Snapshot";
import type { RuntimeEntity } from "../../../engine/runtime/types";
import { getByPath } from "../../../utils/objectUtils";

export type PassiveEffectContext = {
    self: RuntimeEntity;
    globals: Record<string, number>;
};

export const buildGlobalsProxy = (
    snapshot: Snapshot,
    dt: number,
): Record<string, number> =>
    new Proxy({} as Record<string, number>, {
        get: (_target, prop) => {
            if (prop === "dt") return dt;
            if (prop === "dt_s") return dt / 1000;
            if (typeof prop === "string") return snapshot.getGlobal(prop);
            return 0;
        },
    });

const resolveSelfValue = (
    path: string,
    context: PassiveEffectContext,
): number => {
    const val = getByPath(context.self, path);
    if (typeof val === "number") return val;
    if (val && typeof val === "object" && "value" in val) {
        return val.value as number;
    }
    return 0;
};

const resolveStringValue = (
    target: string,
    context: PassiveEffectContext,
): number => {
    if (target.startsWith("global.")) {
        const key = target.slice(7);
        return context.globals[key] ?? 0;
    }
    if (target.startsWith("self.")) {
        const path = target.slice(5);
        return resolveSelfValue(path, context);
    }
    return 0;
};

export const resolveValue = (
    target: string | number | boolean | undefined,
    context: PassiveEffectContext,
): number => {
    if (typeof target === "number") return target;
    if (typeof target === "boolean") return target ? 1 : 0;
    if (typeof target === "string") return resolveStringValue(target, context);
    return 0;
};

export const resolveTargetKey = (target: string): string | null => {
    if (!target.startsWith("self.state.")) return null;
    const parts = target.split(".");
    return parts.length >= 3 ? parts[2] : null;
};

const applyOp = (op: Op | undefined, current: number, operand: number) => {
    switch (op) {
        case Op.SET:
            return operand;
        case Op.ADD:
            return current + operand;
        case Op.SUB:
            return current - operand;
        case Op.MULT:
            return current * operand;
        case Op.DIV:
            return operand === 0 ? current : current / operand;
        default:
            return current;
    }
};

export const applyPassiveEffects = (
    entity: RuntimeEntity,
    globals: Record<string, number>,
    effects: PassiveEffect[],
): Record<string, number> => {
    const pendingUpdates: Record<string, number> = {};
    const context = { self: entity, globals };
    const resolvePendingValue = (
        target: string | number | boolean | undefined,
    ): number =>
        typeof target === "string" && target.startsWith("self.state.")
            ? (pendingUpdates[target] ?? resolveValue(target, context))
            : resolveValue(target, context);

    if (!Array.isArray(effects) || effects.length === 0) {
        return pendingUpdates;
    }

    for (const effect of effects) {
        const targetPath = effect.target;
        if (typeof targetPath !== "string") continue;

        const currentVal =
            pendingUpdates[targetPath] ?? resolvePendingValue(targetPath);

        const operandRaw = effect.value ?? effect.source;
        const operand = resolvePendingValue(operandRaw);

        pendingUpdates[targetPath] = applyOp(effect.op, currentVal, operand);
    }

    return pendingUpdates;
};

