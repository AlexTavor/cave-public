import { describe, it, expect } from "vitest";
import { calculateTransaction } from "./transferLogic";
import { createEntity } from "../test/factories";

describe("calculateTransaction", () => {
    it("clamps payload to target capacity", () => {
        const source = createEntity("source", {
            state: { wood: { value: 10 } },
        });
        const target = createEntity("target", {
            state: { wood: { value: 0, max: 5 } },
            ledger: { incoming: {} },
        });

        const result = calculateTransaction({
            source,
            target,
            payload: { wood: 10 },
        });

        expect(result.success).toBe(true);
        expect(result.clampedPayload.wood).toBe(5);
    });

    it("clamps to available when the source has less than requested", () => {
        const source = createEntity("source", {
            state: { stone: { value: 1 } },
        });
        const target = createEntity("target", {
            state: { stone: { value: 0, max: 10 } },
        });

        const result = calculateTransaction({
            source,
            target,
            payload: { stone: 5 },
        });

        expect(result.success).toBe(true);
        expect(result.clampedPayload.stone).toBe(1);
    });

    it("clamps fractional remainder to available", () => {
        const source = createEntity("source", {
            state: { food: { value: 0.3 } },
        });
        const target = createEntity("target", {
            state: { food: { value: 0, max: 50 } },
        });

        const result = calculateTransaction({
            source,
            target,
            payload: { food: 5 },
        });

        expect(result.success).toBe(true);
        expect(result.clampedPayload.food).toBeCloseTo(0.3);
    });
});
