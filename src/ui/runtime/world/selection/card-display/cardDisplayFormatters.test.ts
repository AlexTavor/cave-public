import { describe, expect, it } from "vitest";
import {
    formatAttributeModifier,
    formatCapsuleFraction,
    formatCapsuleNumber,
    formatEffectSegmentText,
    formatSignedRateText,
    resolveEffectTone,
} from "./cardDisplayFormatters";

describe("cardDisplayFormatters", () => {
    it("formats compact numbers and fractions", () => {
        // Given / When / Then
        expect(formatCapsuleNumber(1200)).toBe("1k");
        expect(formatCapsuleFraction(12, 250)).toBe("12/250");
    });

    it("suppresses zero attribute modifiers", () => {
        // Given / When / Then
        expect(formatAttributeModifier(0)).toBe("");
        expect(formatAttributeModifier(13)).toBe("(+13)");
        expect(formatAttributeModifier(-4)).toBe("(-4)");
    });

    it("preserves explicit interval text", () => {
        // Given / When / Then
        expect(formatEffectSegmentText("+1", "/5s")).toBe("+1/5s");
        expect(formatSignedRateText(3, "/sec")).toBe("+3/sec");
        expect(formatSignedRateText(-2, "/5s")).toBe("-2/5s");
    });

    it("resolves effect tone from sign", () => {
        // Given / When / Then
        expect(resolveEffectTone("Idle", 2)).toBe("positive");
        expect(resolveEffectTone("Idle", -1)).toBe("negative");
        expect(resolveEffectTone("+1/s")).toBe("positive");
        expect(resolveEffectTone("-1/s")).toBe("negative");
        expect(resolveEffectTone("Idle")).toBe("neutral");
    });
});
