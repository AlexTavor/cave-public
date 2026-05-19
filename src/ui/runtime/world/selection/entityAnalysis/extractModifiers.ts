import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { formatNumber, formatTarget } from "../job-card/jobAnalysis.utils";
import type { EntityModifierLabel } from "./entityAnalysis.types";

const UPKEEP_RE = /^vals?_?upkeep_rate_(.+)_\d+$/;

const resolveEntryValue = (entry: unknown): number => {
    if (typeof entry === "number") return entry;
    if (typeof entry === "object" && entry !== null && "value" in entry) {
        return (entry as { value: number }).value;
    }
    return Number.NaN;
};

export const extractUpkeepModifiers = (
    entity: RuntimeEntity,
): EntityModifierLabel[] => {
    const state = entity.state as Record<string, { value: number }> | undefined;
    if (!state) return [];
    const results: EntityModifierLabel[] = [];
    for (const key of Object.keys(state)) {
        const match = UPKEEP_RE.exec(key);
        if (!match) continue;
        const resource = match[1];
        const entry = state[key];
        const value = resolveEntryValue(entry);
        if (Number.isNaN(value) || value === 0) continue;
        results.push({
            targetKey: formatTarget(resource),
            valueStr: formatNumber(-value),
            intervalStr: "/s",
            sourceType: "upkeep",
            sourceId: "upkeep",
        });
    }
    return results;
};

export const extractPowerModifiers = (
    entity: RuntimeEntity,
): EntityModifierLabel[] => {
    const sink = entity.powerSink as { efficiency?: number } | undefined;
    if (!sink?.efficiency) return [];
    const eff = sink.efficiency;
    if (eff > 1.01) {
        const pct = Math.round((eff - 1) * 100);
        return [
            {
                targetKey: "work speed",
                valueStr: `+${pct}%`,
                sourceType: "power",
                sourceId: "overload",
            },
        ];
    }
    if (eff < 0.99) {
        const pct = Math.round((1 - eff) * 100);
        return [
            {
                targetKey: "work speed",
                valueStr: `-${pct}%`,
                sourceType: "power",
                sourceId: "brownout",
            },
        ];
    }
    return [];
};

type AttributeSet = { body?: number; mind?: number; social?: number };
type BodyLike = { attributes?: AttributeSet; baseAttributes?: AttributeSet };

export const extractCaveAttributeModifiers = (
    entity: RuntimeEntity,
): EntityModifierLabel[] => {
    const body = (entity as { body?: BodyLike }).body;
    if (!body?.attributes || !body.baseAttributes) return [];
    const results: EntityModifierLabel[] = [];
    for (const attr of ["body", "mind", "social"] as const) {
        const bonus =
            (body.attributes[attr] ?? 0) - (body.baseAttributes[attr] ?? 0);
        if (bonus === 0) continue;
        const sign = bonus > 0 ? "+" : "";
        results.push({
            targetKey: attr,
            valueStr: `${sign}${bonus}`,
            sourceType: "cave",
            sourceId: "cave",
        });
    }
    return results;
};
