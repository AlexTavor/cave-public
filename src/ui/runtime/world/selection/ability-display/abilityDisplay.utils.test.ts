import { describe, expect, it } from "vitest";
import {
    formatCompactFraction,
    formatCountdownText,
    formatDurationMs,
    formatWholeFraction,
} from "./abilityDisplay.utils";

describe("abilityDisplay utils", () => {
    it("formats milliseconds, seconds, minutes, and hours from milliseconds", () => {
        expect(formatDurationMs(200)).toBe("<1s");
        expect(formatDurationMs(1_000)).toBe("1 s");
        expect(formatDurationMs(90_000)).toBe("1.5 m");
        expect(formatDurationMs(3_600_000)).toBe("1 h");
    });

    it("preserves countdown formatting behavior", () => {
        // Then
        expect(formatCountdownText(10)).toBe("<1s");
        expect(formatCountdownText(50)).toBe("1 s");
        expect(formatCountdownText(75)).toBe("1.5 s");
        expect(formatCountdownText(3_000)).toBe("1 m");
        expect(formatCountdownText(180_000)).toBe("1 h");
    });

    it("returns null for invalid countdown inputs", () => {
        // Then
        expect(formatDurationMs(null)).toBeNull();
        expect(formatCountdownText(null)).toBeNull();
        expect(formatCountdownText(Number.NaN)).toBeNull();
    });

    it("formats compact live fractions with two significant digits", () => {
        expect(formatCompactFraction(4, 10)).toBe("4.0/10");
        expect(formatCompactFraction(1_200, 12_000)).toBe("1.2k/12k");
    });

    it("formats whole fractions without square brackets", () => {
        expect(formatWholeFraction(100, 100)).toBe("100/100");
        expect(formatWholeFraction(58.4, 100)).toBe("58/100");
    });
});
