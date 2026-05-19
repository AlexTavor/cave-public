import { describe, expect, it } from "vitest";
import { PHYSICS_DEFAULT_RADIUS } from "../../../data/schemas/physics";
import {
    computeTransferScale,
    resolveDisplayRadius,
    resolveEntityPath,
    resolveRefValue,
    sumPayload,
} from "./gameSceneMath";

const makeEntity = () => ({
    state: {
        wood: { value: 5 },
        maxWood: { value: 10 },
    },
    flag: true,
    count: 2,
    nested: { value: 7 },
});

describe("gameSceneMath", () => {
    it("resolveEntityPath reads numbers, booleans, and value objects", () => {
        const entity = makeEntity();
        expect(resolveEntityPath(entity as any, "state.wood.value")).toBe(5);
        expect(resolveEntityPath(entity as any, "flag")).toBe(1);
        expect(resolveEntityPath(entity as any, "count")).toBe(2);
        expect(resolveEntityPath(entity as any, "nested")).toBe(7);
        expect(resolveEntityPath(entity as any, "missing.path")).toBe(0);
    });

    it("resolveRefValue handles self prefixes", () => {
        const entity = makeEntity();
        expect(resolveRefValue(entity as any, "self.state.wood.value")).toBe(5);
        expect(resolveRefValue(entity as any, "state.wood.value")).toBe(5);
    });

    it("resolveDisplayRadius falls back to defaults", () => {
        const entity = makeEntity();
        const result = resolveDisplayRadius(entity as any, null, null);
        expect(result.baseRadius).toBe(PHYSICS_DEFAULT_RADIUS);
        expect(result.radius).toBe(PHYSICS_DEFAULT_RADIUS);
    });

    it("resolveDisplayRadius interpolates using refs", () => {
        const entity = makeEntity();
        const display = {
            radius: {
                min: 10,
                max: 20,
                valueRef: "self.state.wood.value",
                maxRef: "self.state.maxWood.value",
            },
        };
        const result = resolveDisplayRadius(entity as any, display, null);
        expect(result.baseRadius).toBe(10);
        expect(result.radius).toBe(15);
    });

    it("sumPayload ignores non-finite values", () => {
        expect(sumPayload(undefined)).toBe(0);
        expect(sumPayload({ wood: 2, stone: Number.NaN })).toBe(2);
    });

    it("computeTransferScale grows logarithmically", () => {
        const result = computeTransferScale(4, { wood: 9 });
        expect(result.radius).toBe(8);
        expect(result.scale).toBe(2);
        const base = computeTransferScale(4, undefined);
        expect(base.radius).toBe(4);
        expect(base.scale).toBe(1);
    });
});
