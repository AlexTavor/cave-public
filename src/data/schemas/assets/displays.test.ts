import { describe, expect, it } from "vitest";
import { ResourceDisplayAssetSchema } from "./displays";

const baseAsset = { type: "resource", styleId: "ember", glyphKey: "flame" };

describe("ResourceDisplayAssetSchema", () => {
    it("accepts resource display without rule", () => {
        expect(ResourceDisplayAssetSchema.parse(baseAsset)).toMatchObject(
            baseAsset,
        );
    });

    it("accepts complete valid rule", () => {
        const parsed = ResourceDisplayAssetSchema.parse({
            ...baseAsset,
            transferNodeRadiusByValue: {
                minValue: 1,
                minRadius: 2,
                maxValue: 5,
                maxRadius: 6,
            },
        });
        expect(parsed.transferNodeRadiusByValue?.maxRadius).toBe(6);
    });

    it("rejects partial rule", () => {
        const parsed = ResourceDisplayAssetSchema.safeParse({
            ...baseAsset,
            transferNodeRadiusByValue: { minValue: 1, minRadius: 2 },
        });
        expect(parsed.success).toBe(false);
    });

    it("rejects minValue greater than maxValue", () => {
        const parsed = ResourceDisplayAssetSchema.safeParse({
            ...baseAsset,
            transferNodeRadiusByValue: {
                minValue: 5,
                minRadius: 1,
                maxValue: 4,
                maxRadius: 2,
            },
        });
        expect(parsed.success).toBe(false);
    });

    it("rejects negative radius", () => {
        const parsed = ResourceDisplayAssetSchema.safeParse({
            ...baseAsset,
            transferNodeRadiusByValue: {
                minValue: 1,
                minRadius: -1,
                maxValue: 4,
                maxRadius: 2,
            },
        });
        expect(parsed.success).toBe(false);
    });
});
