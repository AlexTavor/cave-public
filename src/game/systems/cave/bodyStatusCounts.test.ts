import { describe, expect, it } from "vitest";
import { resolveBodyStatusCounts } from "./bodyStatusCounts";

describe("resolveBodyStatusCounts", () => {
    it("counts hungry and cold bodies while ignoring non-body entities", () => {
        // Given
        const entities = [
            { id: "body-1", body: {}, traits: ["starving"] },
            { id: "body-2", body: { traits: ["cold"] } },
            { id: "body-3", body: {}, traits: ["starving", "cold"] },
            { id: "rock-1", traits: ["starving", "cold"] },
        ] as any;

        // When
        const result = resolveBodyStatusCounts(entities);

        // Then
        expect(result).toEqual({ starvingBodies: 2, coldBodies: 2 });
    });

    it("handles empty input", () => {
        // Given
        const entities: any[] = [];

        // When
        const result = resolveBodyStatusCounts(entities);

        // Then
        expect(result).toEqual({ starvingBodies: 0, coldBodies: 0 });
    });
});
