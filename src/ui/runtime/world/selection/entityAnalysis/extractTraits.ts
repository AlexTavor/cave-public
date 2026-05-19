import type { TraitDefinition } from "../../../../../data/schemas/game/traits";
import type { TraitInstance } from "../../../../../data/schemas/components";
import { formatNumber, formatTarget } from "../job-card/jobAnalysis.utils";
import type {
    EntityTraitSummary,
    TraitEffectLabel,
} from "./entityAnalysis.types";

const formatModValue = (op: string, value: number): string => {
    if (op === "MULT") {
        const pct = Math.round((value - 1) * 100);
        return pct >= 0 ? `+${pct}%` : `${pct}%`;
    }
    const sign = op === "SUB" ? "-" : "+";
    return `${sign}${formatNumber(Math.abs(value))}`;
};

const extractModifierEffects = (def: TraitDefinition): TraitEffectLabel[] =>
    (def.modifiers ?? [])
        .filter((m) => m.value != null)
        .map((m) => ({
            targetKey: formatTarget(m.target),
            valueStr: formatModValue(m.op, m.value!),
        }));

const extractCycleEffects = (def: TraitDefinition): TraitEffectLabel[] =>
    (def.cycles ?? []).flatMap((cycle) =>
        cycle.effects.map((e) => {
            const sign = e.op === "SUB" ? "-" : "+";
            return {
                targetKey: formatTarget(e.target),
                valueStr: `${sign}${formatNumber(Math.abs((e.value ?? 0) / cycle.periodSeconds))}`,
                intervalStr: `/s`,
            };
        }),
    );

export const extractTraits = (
    traits: TraitInstance[],
    traitIndex: Record<string, TraitDefinition>,
): EntityTraitSummary[] =>
    traits.map((t) => {
        const def = traitIndex[t.id];
        if (!def) {
            return {
                traitId: t.id,
                label: t.id,
                effects: [],
                remainingSeconds: t.remainingSeconds,
            };
        }
        return {
            traitId: t.id,
            label: def.label,
            description: def.description,
            effects: [
                ...extractModifierEffects(def),
                ...extractCycleEffects(def),
            ],
            remainingSeconds: t.remainingSeconds,
        };
    });

