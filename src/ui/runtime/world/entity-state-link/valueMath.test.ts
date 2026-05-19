import { describe, expect, it } from "vitest";
import {
    computePercentage,
    didVisualProgressChange,
    formatProgressTransform,
} from "./valueMath";

describe("entity-state-link value math", () => {
    it("resolves percentages and transform strings safely", () => {
        expect(computePercentage(30, 60)).toBe(50);
        expect(computePercentage(null, null)).toBe(0);
        expect(formatProgressTransform(50)).toBe("scaleX(0.5)");
    });

    it("detects when the visual progress state changed", () => {
        expect(didVisualProgressChange("", "", "scaleX(0.2)", 20)).toBe(true);
        expect(
            didVisualProgressChange("scaleX(0.2)", "20", "scaleX(0.2)", 20),
        ).toBe(false);
    });
});
