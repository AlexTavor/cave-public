import { describe, expect, it } from "vitest";
import { cameraStatesEquivalent } from "./cameraStateComparison";

describe("cameraStatesEquivalent", () => {
    it("treats sub-threshold deltas as equivalent", () => {
        expect(
            cameraStatesEquivalent(
                { centerX: 10, centerY: 20, zoom: 1 },
                { centerX: 10.49, centerY: 20.49, zoom: 1.0009 },
            ),
        ).toBe(true);
    });

    it("treats larger deltas on any field as different", () => {
        expect(
            cameraStatesEquivalent(
                { centerX: 10, centerY: 20, zoom: 1 },
                { centerX: 10.5, centerY: 20, zoom: 1 },
            ),
        ).toBe(false);
        expect(
            cameraStatesEquivalent(
                { centerX: 10, centerY: 20, zoom: 1 },
                { centerX: 10, centerY: 20.5, zoom: 1 },
            ),
        ).toBe(false);
        expect(
            cameraStatesEquivalent(
                { centerX: 10, centerY: 20, zoom: 1 },
                { centerX: 10, centerY: 20, zoom: 1.0011 },
            ),
        ).toBe(false);
    });
});
