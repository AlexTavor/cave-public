import { describe, expect, it } from "vitest";
import { resolveTransferNodeRadius } from "./resolveTransferNodeRadius";

const displays = (rule?: Record<string, number>) => ({
    ore: {
        type: "resource",
        styleId: "ore",
        glyphKey: "ore",
        transferNodeRadiusByValue: rule,
    },
});

describe("resolveTransferNodeRadius", () => {
    it("falls back when no rule exists", () => {
        const result = resolveTransferNodeRadius({
            payload: { ore: 3 },
            displays: displays(),
            fallbackRadius: 8,
        });
        expect(result).toEqual({ radius: 8, warning: null });
    });

    it("uses min radius below authored range", () => {
        const result = resolveTransferNodeRadius({
            payload: { ore: 1 },
            displays: displays({
                minValue: 2,
                minRadius: 3,
                maxValue: 6,
                maxRadius: 7,
            }),
            fallbackRadius: 8,
        });
        expect(result.radius).toBe(3);
    });

    it("uses max radius above authored range", () => {
        const result = resolveTransferNodeRadius({
            payload: { ore: 10 },
            displays: displays({
                minValue: 2,
                minRadius: 3,
                maxValue: 6,
                maxRadius: 7,
            }),
            fallbackRadius: 8,
        });
        expect(result.radius).toBe(7);
    });

    it("interpolates linearly inside authored range", () => {
        const result = resolveTransferNodeRadius({
            payload: { ore: 4 },
            displays: displays({
                minValue: 2,
                minRadius: 3,
                maxValue: 6,
                maxRadius: 7,
            }),
            fallbackRadius: 8,
        });
        expect(result.radius).toBe(5);
    });

    it("supports descending radius across increasing value", () => {
        const result = resolveTransferNodeRadius({
            payload: { ore: 4 },
            displays: displays({
                minValue: 2,
                minRadius: 7,
                maxValue: 6,
                maxRadius: 3,
            }),
            fallbackRadius: 8,
        });
        expect(result.radius).toBe(5);
    });

    it("uses step behavior when minValue equals maxValue", () => {
        const below = resolveTransferNodeRadius({
            payload: { ore: 4 },
            displays: displays({
                minValue: 5,
                minRadius: 2,
                maxValue: 5,
                maxRadius: 6,
            }),
            fallbackRadius: 8,
        });
        const above = resolveTransferNodeRadius({
            payload: { ore: 5 },
            displays: displays({
                minValue: 5,
                minRadius: 2,
                maxValue: 5,
                maxRadius: 6,
            }),
            fallbackRadius: 8,
        });
        expect(below.radius).toBe(2);
        expect(above.radius).toBe(6);
    });

    it("falls back and returns warning for malformed rule input", () => {
        const result = resolveTransferNodeRadius({
            payload: { ore: 4 },
            displays: {
                ore: {
                    type: "resource",
                    transferNodeRadiusByValue: { minValue: 5 },
                },
            },
            fallbackRadius: 8,
        });
        expect(result.radius).toBe(8);
        expect(result.warning).toContain("Invalid transferNodeRadiusByValue");
    });
});
