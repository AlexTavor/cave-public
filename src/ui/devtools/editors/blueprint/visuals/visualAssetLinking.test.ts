import { describe, expect, it } from "vitest";
import { resolveVisualAssetFilename } from "./visualAssetLinking";

describe("resolveVisualAssetFilename", () => {
    it("uses the project root asset pack for root files", () => {
        expect(resolveVisualAssetFilename("egg.bp")).toBe("assets.art");
    });

    it("uses the top-level module asset pack for nested blueprint files", () => {
        expect(resolveVisualAssetFilename("modules/egg.bp")).toBe(
            "modules/assets.art",
        );
        expect(
            resolveVisualAssetFilename("modules/understanding/what_am_i.bp"),
        ).toBe("modules/assets.art");
        expect(
            resolveVisualAssetFilename("example/modules/understanding/how.bp"),
        ).toBe("example/modules/assets.art");
        expect(
            resolveVisualAssetFilename(
                "src/data/raw/example/modules/understanding/how.bp",
            ),
        ).toBe("src/data/raw/example/modules/assets.art");
        expect(resolveVisualAssetFilename("base/npcs/worker.bp")).toBe(
            "base/assets.art",
        );
    });
});
