import { describe, expect, it } from "vitest";
import { resolveBlinkScale } from "./avatarBlink";

const appearance = {
    blinkIntervalMs: 3000,
    blinkDurationMs: 120,
    blinkPhaseMs: 0,
} as any;

describe("resolveBlinkScale", () => {
    it("returns fully open outside the blink window", () => {
        expect(resolveBlinkScale(500, appearance)).toBe(1);
    });

    it("collapses and reopens symmetrically during the blink", () => {
        expect(resolveBlinkScale(0, appearance)).toBe(1);
        expect(resolveBlinkScale(60, appearance)).toBe(0);
        expect(resolveBlinkScale(120, appearance)).toBe(1);
    });
});
