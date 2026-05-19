import type { TraitDefinition } from "../../../data/schemas/game/traits";
import type { RuntimeEntity } from "../../../engine/runtime/types";
import { applyPassiveEffects } from "../passive-effects/passiveEffectUtils";
import { processCycles } from "./traitCycleUtils";

export type TraitIndex = Record<string, TraitDefinition>;

interface TraitInstance {
    id: string;
    remainingSeconds?: number;
    cycles?: Record<string, { accumulatorSeconds: number }>;
}

export interface TraitTickResult {
    changed: boolean;
    pendingUpdates: Record<string, number>;
    survivingTraits: TraitInstance[];
}

const warnOnce = new Set<string>();

const warn = (key: string, msg: string): void => {
    if (warnOnce.has(key)) return;
    warnOnce.add(key);
    console.warn(msg);
};

export const processEntityTraits = (
    entity: RuntimeEntity,
    dtSeconds: number,
    traitIndex: TraitIndex,
    globals: Record<string, number>,
): TraitTickResult => {
    const rawTraits = (entity as { traits?: TraitInstance[] }).traits;
    if (!Array.isArray(rawTraits) || rawTraits.length === 0) {
        return { changed: false, pendingUpdates: {}, survivingTraits: [] };
    }

    let changed = false;
    const surviving: TraitInstance[] = [];
    let allUpdates: Record<string, number> = {};

    for (const trait of rawTraits) {
        const def = traitIndex[trait.id];
        if (!def) {
            warn(`${entity.id}:${trait.id}`, `Unknown trait '${trait.id}'`);
            surviving.push(trait);
            continue;
        }

        if (typeof trait.remainingSeconds === "number") {
            trait.remainingSeconds -= dtSeconds;
            if (trait.remainingSeconds <= 0) {
                changed = true;
                continue;
            }
            changed = true;
        }

        if (def.modifiers && def.modifiers.length > 0) {
            const updates = applyPassiveEffects(entity, globals, def.modifiers);
            allUpdates = { ...allUpdates, ...updates };
        }

        const cycleUpdates = processCycles(
            entity,
            trait,
            def,
            dtSeconds,
            globals,
        );
        if (cycleUpdates.changed) changed = true;
        allUpdates = { ...allUpdates, ...cycleUpdates.updates };

        surviving.push(trait);
    }

    if (surviving.length !== rawTraits.length) changed = true;
    return { changed, pendingUpdates: allUpdates, survivingTraits: surviving };
};
