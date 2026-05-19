import type { RuntimeEntity } from "../../../engine/runtime/types";

type AttributeKey = "body" | "mind" | "social";

const KEYS = ["body", "mind", "social"] as const;

const readAttributes = (entity: RuntimeEntity) =>
    (
        entity as {
            body?: { attributes?: Partial<Record<AttributeKey, number>> };
        }
    ).body?.attributes ?? {};

const readDemandCap = (entity: RuntimeEntity, attr: AttributeKey) => {
    const sink = (entity as { powerSink?: Record<string, any> }).powerSink;
    return sink?.maxDemand?.[attr] ?? sink?.baseDemand?.[attr] ?? 0;
};

const dominantAttribute = (values: Record<AttributeKey, number>) => {
    if (KEYS.every((key) => values[key] <= 0)) return "none" as const;
    let best: AttributeKey = "body";
    for (const key of ["mind", "social"] as const)
        if (values[key] > values[best]) best = key;
    return best;
};

export const resolvePowerPointerPreview = (
    carriedBodies: RuntimeEntity[],
    targetEntity: RuntimeEntity,
) => {
    const carried = carriedBodies.reduce(
        (totals, entity) => {
            const attrs = readAttributes(entity);
            for (const key of KEYS) totals[key] += attrs[key] ?? 0;
            return totals;
        },
        { body: 0, mind: 0, social: 0 } as Record<AttributeKey, number>,
    );
    const effective = KEYS.reduce(
        (totals, key) => {
            totals[key] = Math.min(
                carried[key],
                readDemandCap(targetEntity, key),
            );
            return totals;
        },
        { body: 0, mind: 0, social: 0 } as Record<AttributeKey, number>,
    );
    return {
        amount: effective.body + effective.mind + effective.social,
        ...effective,
        mode: "power" as const,
        dominant: dominantAttribute(effective),
    };
};
