import { describe, expect, it } from "vitest";
import { toAssetModule, toSemanticFragment } from "./semanticModuleFragments";

describe("semanticModuleFragments .art display ids", () => {
    it("preserves authored display ids without alias-collapsing them", () => {
        const moduleData = toAssetModule("modules/assets.art", {
            displays: {
                luretraveler: {
                    type: "resource",
                    styleId: "luretraveler",
                    glyphKey: "luretraveler",
                },
                outside: {
                    type: "resource",
                    styleId: "outside",
                    glyphKey: "outside",
                },
            },
        });

        expect(
            Object.keys(moduleData.assets.displays).sort((left, right) =>
                left.localeCompare(right),
            ),
        ).toEqual(["luretraveler", "outside"]);
        expect(
            toSemanticFragment("modules/assets.art", moduleData),
        ).toMatchObject({
            displays: {
                luretraveler: { styleId: "luretraveler" },
                outside: { styleId: "outside" },
            },
        });
    });
});
