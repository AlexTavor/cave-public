import type { PassiveEffect } from "../../../data/schemas/components";
import { Op } from "../../../data/schemas/primitives";
import type { RuntimeEntity } from "../../../engine/runtime/types";
import { resolveValue } from "../passive-effects/passiveEffectUtils";
import type { AttributeKey, AttributeTotals } from "./attributes";
import type { TraitIndex } from "./traits";

const ATTR_PREFIX = "self.body.attributes.";
const ATTR_KEYS = new Set<string>(["body", "mind", "social"]);

const applyOp = (op: Op | undefined, base: number, val: number): number => {
    switch (op) {
        case Op.SET:
            return val;
        case Op.ADD:
            return base + val;
        case Op.SUB:
            return base - val;
        case Op.MULT:
            return base * val;
        case Op.DIV:
            return val === 0 ? base : base / val;
        default:
            return base;
    }
};

export const applyAttributeModifiers = (
    derived: AttributeTotals,
    entity: RuntimeEntity,
    traitIndex: TraitIndex,
    globals: Record<string, number>,
): AttributeTotals => {
    const effects = collectAttributeEffects(entity, traitIndex);
    if (effects.length === 0) return derived;

    const result = { ...derived };
    const ctx = { self: entity, globals };

    for (const effect of effects) {
        const key = effect.target?.slice(ATTR_PREFIX.length) as AttributeKey;
        if (!ATTR_KEYS.has(key)) continue;
        const operand = resolveValue(effect.value ?? effect.source, ctx);
        result[key] = applyOp(effect.op, result[key], operand);
    }

    return result;
};

const collectAttributeEffects = (
    entity: RuntimeEntity,
    traitIndex: TraitIndex,
): PassiveEffect[] => {
    const effects: PassiveEffect[] = [];
    const traits = (entity as { traits?: { id: string }[] }).traits;
    if (!traits) return effects;

    for (const t of traits) {
        const def = traitIndex[t.id];
        if (!def?.modifiers) continue;
        for (const m of def.modifiers) {
            if (
                typeof m.target === "string" &&
                m.target.startsWith(ATTR_PREFIX)
            ) {
                effects.push(m);
            }
        }
    }
    return effects;
};
