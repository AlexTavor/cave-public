import { describe, expect, it } from "vitest";
import { clampPayloadToCapacity, calculateHeadroom } from "./capacityUtils";
import { createEntity } from "../../test/factories";

describe("capacityUtils", () => {
    it("clamps payload using per-resource max", () => {
        // Given
        const target = createEntity("target", {
            state: {
                wood: { value: 20, max: 50 },
            },
            ledger: { incoming: { wood: 10 } },
        });

        // When
        const payload = clampPayloadToCapacity(target, { wood: 50 });

        // Then
        expect(payload).toEqual({ wood: 20 });
    });

    it("returns zero headroom when oversaturated", () => {
        // Given
        const target = createEntity("target", {
            state: {
                wood: { value: 60, max: 50 },
            },
            ledger: { incoming: { wood: 10 } },
        });

        // When
        const headroom = calculateHeadroom(target, "wood");

        // Then
        expect(headroom).toBe(0);
    });

    it("returns infinite headroom when resource is missing", () => {
        // Given
        const target = createEntity("target", { state: {} });

        // When
        const headroom = calculateHeadroom(target, "ore");

        // Then
        expect(headroom).toBe(Number.POSITIVE_INFINITY);
    });
});
