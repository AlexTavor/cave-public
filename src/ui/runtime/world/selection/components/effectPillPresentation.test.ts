import { describe, expect, it } from "vitest";
import {
    formatCompactEffectValue,
    formatFullEffectValue,
    formatModifierSourceValue,
    resolveBodyEffectIconId,
} from "./effectPillPresentation";

describe("effectPillPresentation", () => {
    it("returns the existing icon for known target keys", () => {
        expect(resolveBodyEffectIconId("body")).toBe("attr_body");
    });

    it("returns undefined for unknown target keys", () => {
        expect(resolveBodyEffectIconId("unknown")).toBeUndefined();
    });

    it("keeps compact values unchanged without an interval", () => {
        expect(formatCompactEffectValue("+9")).toBe("+9");
    });

    it("concatenates compact values with intervals without whitespace", () => {
        expect(formatCompactEffectValue("-1", "/s")).toBe("-1/s");
    });

    it("formats full tooltip text for effects and modifier sources", () => {
        expect(formatFullEffectValue("-1", "/s", "body")).toBe("-1/s body");
        expect(formatModifierSourceValue("+1", "/5s", "regen")).toBe(
            "+1/5s (regen)",
        );
    });
});
