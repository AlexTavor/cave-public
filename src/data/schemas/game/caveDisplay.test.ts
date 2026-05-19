import { describe, expect, it } from "vitest";
import {
    CaveDisplayConfigSchema,
    DEFAULT_CAVE_DISPLAY_CONFIG,
} from "./caveDisplay";

describe("CaveDisplayConfigSchema", () => {
    it("parses the default cave display config", () => {
        const parsed = CaveDisplayConfigSchema.parse(
            DEFAULT_CAVE_DISPLAY_CONFIG,
        );
        expect(parsed.eyes.eyeTravel).toBe(1.98);
        expect(parsed.fur.sampleCount).toBe(196);
    });

    it("rejects drivers whose min exceeds max", () => {
        expect(() =>
            CaveDisplayConfigSchema.parse({
                ...DEFAULT_CAVE_DISPLAY_CONFIG,
                fur: {
                    ...DEFAULT_CAVE_DISPLAY_CONFIG.fur,
                    lengthPx: {
                        ...DEFAULT_CAVE_DISPLAY_CONFIG.fur.lengthPx,
                        min: 9,
                        max: 8,
                    },
                },
            }),
        ).toThrow(/min must be <= max/);
    });

    it("rejects invalid fur structural rules", () => {
        expect(() =>
            CaveDisplayConfigSchema.parse({
                ...DEFAULT_CAVE_DISPLAY_CONFIG,
                fur: {
                    ...DEFAULT_CAVE_DISPLAY_CONFIG.fur,
                    hairStride: DEFAULT_CAVE_DISPLAY_CONFIG.fur.sampleCount,
                },
            }),
        ).toThrow(/hairStride/);
        expect(() =>
            CaveDisplayConfigSchema.parse({
                ...DEFAULT_CAVE_DISPLAY_CONFIG,
                fur: {
                    ...DEFAULT_CAVE_DISPLAY_CONFIG.fur,
                    tipWidthPx: {
                        ...DEFAULT_CAVE_DISPLAY_CONFIG.fur.tipWidthPx,
                        max: 99,
                    },
                },
            }),
        ).toThrow(/tipWidthPx.max/);
    });
});
