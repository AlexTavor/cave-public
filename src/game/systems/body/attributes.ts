import type { BodyComponent } from "../../../data/schemas/game/body";
import { pseudoRandom } from "../../../utils/pseudoRandom";

export type AttributeTotals = Pick<
    BodyComponent["attributes"],
    "body" | "mind" | "social"
>;
export type AttributeKey = keyof AttributeTotals;

export const cloneAttributes = (
    attributes: AttributeTotals,
): AttributeTotals => ({
    body: attributes.body,
    mind: attributes.mind,
    social: attributes.social,
});

export const toAttributeTotals = (
    source: Partial<AttributeTotals> | undefined,
    fallback: number = 0,
): AttributeTotals => ({
    body: Number(source?.body ?? fallback),
    mind: Number(source?.mind ?? fallback),
    social: Number(source?.social ?? fallback),
});

export const incrementAttribute = (
    attributes: AttributeTotals,
    key: AttributeKey,
    amount: number,
): AttributeTotals => ({
    ...attributes,
    [key]: attributes[key] + amount,
});

export const lowestAttributeKey = (
    attributes: AttributeTotals,
): AttributeKey => {
    const pairs: Array<[AttributeKey, number]> = [
        ["body", attributes.body],
        ["mind", attributes.mind],
        ["social", attributes.social],
    ];
    pairs.sort((left, right) => left[1] - right[1]);
    return pairs[0]?.[0] ?? "body";
};

export const attributesEqual = (
    left: AttributeTotals,
    right: AttributeTotals,
): boolean =>
    left.body === right.body &&
    left.mind === right.mind &&
    left.social === right.social;

/**
 * Selects an attribute randomly, weighted by the current values of the attributes.
 * This creates a "specialization" effect where higher stats are more likely to increase.
 * Uses a deterministic seed (Entity ID + Level) to ensure replayability.
 */
export const pickWeightedAttribute = (
    attributes: AttributeTotals,
    seed: string,
): AttributeKey => {
    const total = attributes.body + attributes.mind + attributes.social;

    // Fallback if all attributes are 0 (fresh entity) - uniform random
    if (total <= 0) {
        const roll = pseudoRandom(seed);
        if (roll < 0.33) return "body";
        if (roll < 0.66) return "mind";
        return "social";
    }

    const roll = pseudoRandom(seed) * total;

    if (roll < attributes.body) return "body";
    if (roll < attributes.body + attributes.mind) return "mind";
    return "social";
};

