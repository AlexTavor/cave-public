import type { BodyComponent } from "../../../data/schemas/game/body";
import type { AttributeTotals } from "./attributes";
import {
    incrementAttribute,
    pickWeightedAttribute,
    toAttributeTotals,
} from "./attributes";
import { withWorldSeed } from "../../../utils/worldSeed";

export type BodyProgressionResult = {
    xp: number;
    level: number;
    baseAttributes: AttributeTotals;
    derivedAttributes: AttributeTotals;
};

const XP_GROWTH_FACTOR = 2.5;
const DEFAULT_XP_PER_LEVEL = 100;

const getLevelThreshold = (targetLevel: number, baseCost: number): number => {
    let cost = baseCost;
    for (let i = 1; i < targetLevel; i++) {
        cost = Math.max(cost + baseCost, cost * XP_GROWTH_FACTOR);
    }
    return Math.floor(cost);
};

export const resolveXpThreshold = (level: number): number =>
    getLevelThreshold(level, DEFAULT_XP_PER_LEVEL);

export const calculateBodyProgression = (
    body: BodyComponent,
    dt: number,
    xpPerLevel: number,
    entityId: string,
    worldSeed: string = "world",
): BodyProgressionResult => {
    const xpDelta = (dt / 1000) * (body.xpRate ?? 1);

    let xp = (body.xp ?? 0) + xpDelta;
    let level = body.level ?? 1;
    let baseAttributes = toAttributeTotals(body.baseAttributes, 0);

    let threshold = getLevelThreshold(level, xpPerLevel);

    while (xp >= threshold) {
        xp -= threshold;
        level += 1;

        const seed = withWorldSeed(worldSeed, `${entityId}:${level}`);
        const target = pickWeightedAttribute(baseAttributes, seed);

        baseAttributes = incrementAttribute(baseAttributes, target, 1);

        threshold = Math.floor(
            Math.max(threshold + xpPerLevel, threshold * XP_GROWTH_FACTOR),
        );
    }

    const derivedAttributes = baseAttributes;

    return {
        xp,
        level,
        baseAttributes,
        derivedAttributes,
    };
};

