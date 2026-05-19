import { describe, expect, it } from "vitest";
import type { ModuleDisplayAsset } from "../../../state/moduleStore.assets";
import {
    createDefaultDisplayAsset,
    formatDisplayTags,
    getDisplayDefinitionSummary,
    getDisplayMetadataSummary,
    parseDisplayTags,
    retypeDisplayAsset,
    validateDisplayRename,
} from "./displayEditorHelpers";

describe("displayEditorHelpers", () => {
    it("creates default assets and preserves metadata across retypes", () => {
        expect(
            ["body", "attribute_pool", "resource"].map((type) =>
                createDefaultDisplayAsset(type as any),
            ),
        ).toEqual([
            { type: "body" },
            { type: "attribute_pool", attribute: "body" },
            { type: "resource", styleId: "", glyphKey: "" },
        ]);
        const resource: ModuleDisplayAsset = {
            type: "resource",
            styleId: "oak",
            glyphKey: "leaf",
            tooltip: "Tip",
            tags: ["a", "b"],
        };
        expect(retypeDisplayAsset(resource, "body")).toEqual({
            type: "body",
            tooltip: "Tip",
            tags: ["a", "b"],
        });
        expect(retypeDisplayAsset(resource, "attribute_pool")).toEqual({
            type: "attribute_pool",
            attribute: "body",
            tooltip: "Tip",
            tags: ["a", "b"],
        });
        expect(
            retypeDisplayAsset(
                {
                    type: "attribute_pool",
                    attribute: "mind",
                    tooltip: "Tip",
                    tags: ["a"],
                },
                "resource",
            ),
        ).toEqual({
            type: "resource",
            styleId: "",
            glyphKey: "",
            tooltip: "Tip",
            tags: ["a"],
        });
    });

    it("parses tags, validates renames, and formats summaries", () => {
        const displays: Record<string, ModuleDisplayAsset> = {
            alpha: { type: "body" },
            beta: {
                type: "resource",
                styleId: "oak",
                glyphKey: "leaf",
                tooltip: "Shown\nLater",
                tags: ["rare"],
            },
        };
        expect(parseDisplayTags(" one, two ,, three ")).toEqual([
            "one",
            "two",
            "three",
        ]);
        expect(formatDisplayTags(["one", "two"])).toBe("one, two");
        expect(validateDisplayRename(displays, "alpha", "")).toBe("empty");
        expect(validateDisplayRename(displays, "alpha", "beta")).toBe(
            "duplicate",
        );
        expect(validateDisplayRename(displays, "missing", "gamma")).toBe(
            "missing_current",
        );
        expect(validateDisplayRename(displays, "alpha", "gamma")).toBeNull();
        expect([
            getDisplayDefinitionSummary(displays.alpha),
            getDisplayDefinitionSummary({
                type: "attribute_pool",
                attribute: "mind",
            }),
            getDisplayDefinitionSummary(displays.beta),
        ]).toEqual(["body", "attribute_pool · mind", "resource · oak / leaf"]);
        expect(getDisplayMetadataSummary(displays.beta)).toBe("Shown");
        expect(
            getDisplayMetadataSummary({
                type: "body",
                tags: ["authored", "rare"],
            }),
        ).toBe("tags: authored, rare");
        expect(getDisplayMetadataSummary({ type: "body" })).toBe("No metadata");
    });
});
