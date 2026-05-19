import { describe, expect, it } from "vitest";
import {
    buildBodyAvatarCacheKey,
    buildDisplayCacheKey,
} from "./buildDisplayImageCacheKey";

describe("buildDisplayImageCacheKey", () => {
    const appearance = {
        appearanceKey: "a",
        faceShapeIndex: 0,
        hairShapeIndex: 0,
        eyeShapeIndex: 0,
        eyeOffsetY: 0,
        eyeSpacing: 12,
        eyeScaleX: 1,
        eyeScaleY: 1,
        blinkIntervalMs: 1000,
        blinkDurationMs: 120,
        blinkPhaseMs: 0,
    } as const;

    it("builds cache keys for display and avatar requests", () => {
        expect(
            buildDisplayCacheKey({
                kind: "attribute_display",
                displayKey: "attr_body",
            }),
        ).toBe("attribute:attr_body");
        expect(
            buildBodyAvatarCacheKey({
                kind: "body_avatar",
                subjectSeed: "body-1",
                glyphKey: null,
                appearance,
                glyphs: {},
                renderSeed: "seed",
            }),
        ).toContain('"subjectSeed":"body-1"');
    });

    it("throws for empty required values", () => {
        expect(() =>
            buildDisplayCacheKey({ kind: "attribute_display", displayKey: "" }),
        ).toThrow(/display key/i);
        expect(() =>
            buildBodyAvatarCacheKey({
                kind: "body_avatar",
                subjectSeed: "",
                glyphKey: null,
                appearance,
                glyphs: {},
                renderSeed: "seed",
            }),
        ).toThrow(/subject seed/i);
    });
});
