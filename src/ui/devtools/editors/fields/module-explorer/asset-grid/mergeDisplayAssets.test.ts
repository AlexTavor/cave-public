import { describe, expect, it } from "vitest";
import { mergeDisplayAssets } from "./mergeDisplayAssets";

describe("mergeDisplayAssets", () => {
    it("lets session entries override module entries", () => {
        const merged = mergeDisplayAssets(
            { alpha: { type: "resource", styleId: "old", glyphKey: "old" } },
            { alpha: { type: "resource", styleId: "new", glyphKey: "new" } },
        );

        expect(merged.alpha).toMatchObject({ styleId: "new", glyphKey: "new" });
    });
});
