import { describe, expect, it } from "vitest";
import type { TabNode } from "flexlayout-react";
import { resolveEditorComponent } from "./WindowLayoutResolver.editors";
import { AssetCategoryEditor } from "../../editors/config/AssetCategoryEditor";

const configNode = (component: string, config: Record<string, string>) =>
    ({
        getComponent: () => component,
        getConfig: () => config,
        getId: () => `${component}:${config.filename}`,
    }) as unknown as TabNode;

describe("resolveEditorComponent glyph asset route", () => {
    it("routes glyph asset lists to AssetCategoryEditor", () => {
        expect(
            resolveEditorComponent(
                configNode("asset_list", {
                    filename: "modules/assets.art",
                    category: "glyphs",
                }),
            )?.type,
        ).toBe(AssetCategoryEditor);
    });
});
