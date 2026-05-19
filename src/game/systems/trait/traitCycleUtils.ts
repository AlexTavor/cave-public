import type { TraitDefinition } from "../../../data/schemas/game/traits";
import type { RuntimeEntity } from "../../../engine/runtime/types";
import {
    applyPassiveEffects,
    resolveValue,
} from "../passive-effects/passiveEffectUtils";

interface TraitInstance {
    id: string;
    remainingSeconds?: number;
    cycles?: Record<string, { accumulatorSeconds: number }>;
}

const warnOnce = new Set<string>();

const warn = (key: string, msg: string): void => {
    if (warnOnce.has(key)) return;
    warnOnce.add(key);
    console.warn(msg);
};

export const processCycles = (
    entity: RuntimeEntity,
    trait: TraitInstance,
    def: TraitDefinition,
    dtSeconds: number,
    globals: Record<string, number>,
): { changed: boolean; updates: Record<string, number> } => {
    if (!def.cycles || def.cycles.length === 0)
        return { changed: false, updates: {} };

    let changed = false;
    let updates: Record<string, number> = {};
    trait.cycles ??= {};

    for (const cycle of def.cycles) {
        if (cycle.periodSeconds <= 0) {
            warn(`${entity.id}:${trait.id}:${cycle.id}`, `Invalid period`);
            continue;
        }
        trait.cycles[cycle.id] ??= { accumulatorSeconds: 0 };
        const acc = trait.cycles[cycle.id];
        acc.accumulatorSeconds += dtSeconds;
        changed = true;

        while (acc.accumulatorSeconds >= cycle.periodSeconds) {
            acc.accumulatorSeconds -= cycle.periodSeconds;
            const result = applyPassiveEffects(entity, globals, cycle.effects);
            for (const [key, val] of Object.entries(result)) {
                if (key in updates) {
                    const base = resolveValue(key, { self: entity, globals });
                    updates[key] = updates[key] + (val - base);
                } else {
                    updates[key] = val;
                }
            }
        }
    }

    return { changed, updates };
};
