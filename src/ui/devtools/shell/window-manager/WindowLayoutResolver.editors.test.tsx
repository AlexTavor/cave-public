import { describe, expect, it } from "vitest";
import type { TabNode } from "flexlayout-react";
import { resolveEditorComponent } from "./WindowLayoutResolver.editors";
import { BlueprintFileEditor } from "../../editors/file/BlueprintFileEditor";
import { CvsEditor } from "../../editors/file/CvsEditor";
import { AssetPackEditor } from "../../editors/file/AssetPackEditor";
import { SystemConfigEditor } from "../../editors/file/SystemConfigEditor";
import { DraftPackEditor } from "../../editors/file/DraftPackEditor";
import { ManifestEditor } from "../../editors/manifest/ManifestEditor";
import { RawJsonEditor } from "../../editors/manifest/RawJsonEditor";
import { UnknownFileViewer } from "../../editors/manifest/UnknownFileViewer";
import { DraftOptionsPanel } from "../../editors/draft/options/DraftOptionsPanel";
import { DraftPoolListPanel } from "../../editors/draft/pools/DraftPoolListPanel";
import { DraftPoolEditor } from "../../editors/draft/pools/DraftPoolEditor";
import { BackgroundConfigEditor } from "../../editors/config/BackgroundConfigEditor";
import { GameConfigEditor } from "../../editors/config/GameConfigEditor";
import { VeinConfigEditor } from "../../editors/config/VeinConfigEditor";
import { TraitsEditor } from "../../editors/config/TraitsEditor";
import { AssetCategoryEditor } from "../../editors/config/AssetCategoryEditor";
import { AssetListPanel } from "../../editors/fields/module-explorer/AssetListPanel";
import { CameraWorldConfigEditor } from "../../editors/config/CameraWorldConfigEditor";

const node = (component: string, path: string) =>
    ({
        getComponent: () => component,
        getConfig: () => ({ path }),
        getId: () => `${component}:${path}`,
    }) as unknown as TabNode;

const configNode = (component: string, config: Record<string, string>) =>
    ({
        getComponent: () => component,
        getConfig: () => config,
        getId: () => `${component}:${config.filename}`,
    }) as unknown as TabNode;

describe("resolveEditorComponent file routes", () => {
    it("routes standard project file types", () => {
        expect(
            resolveEditorComponent(node("file", "modules/egg.bp"))?.type,
        ).toBe(BlueprintFileEditor);
        expect(
            resolveEditorComponent(node("file", "modules/assets.art"))?.type,
        ).toBe(AssetPackEditor);
        expect(
            resolveEditorComponent(node("file", "modules/core.cave"))?.type,
        ).toBe(SystemConfigEditor);
        expect(
            resolveEditorComponent(node("file", "modules/progression.draft"))
                ?.type,
        ).toBe(DraftPackEditor);
    });

    it("routes manifest and json variants", () => {
        expect(
            resolveEditorComponent(node("file", "manifest.json"))?.type,
        ).toBe(ManifestEditor);
        expect(
            resolveEditorComponent(node("file", "modules/data.json"))?.type,
        ).toBe(RawJsonEditor);
    });

    it("routes cvs and unknown extensions", () => {
        expect(
            resolveEditorComponent(node("file", "scripts/init.cvs"))?.type,
        ).toBe(CvsEditor);
        expect(
            resolveEditorComponent(node("file", "scripts/readme.txt"))?.type,
        ).toBe(UnknownFileViewer);
    });

    it("routes draft sub-components", () => {
        const fn = "modules/progression.draft";
        expect(
            resolveEditorComponent(
                configNode("draft_options", { filename: fn }),
            )?.type,
        ).toBe(DraftOptionsPanel);
        expect(
            resolveEditorComponent(
                configNode("draft_pool_list", { filename: fn }),
            )?.type,
        ).toBe(DraftPoolListPanel);
        expect(
            resolveEditorComponent(
                configNode("draft_pool_editor", { filename: fn, poolId: "p1" }),
            )?.type,
        ).toBe(DraftPoolEditor);
    });

    it("routes config sub-editors", () => {
        const fn = "modules/core.cave";
        const resolve = (c: string) =>
            resolveEditorComponent(configNode(c, { filename: fn }))?.type;
        expect(resolve("game_config")).toBe(GameConfigEditor);
        expect(resolve("background_config")).toBe(BackgroundConfigEditor);
        expect(resolve("vein_config")).toBe(VeinConfigEditor);
        expect(resolve("traits")).toBe(TraitsEditor);
        expect(resolve("camera_world")).toBe(CameraWorldConfigEditor);
    });

    it("routes display lists to panel and other asset categories to raw editors", () => {
        const assetNode = (cat: string) =>
            configNode("asset_list", { filename: "m.art", category: cat });
        expect(resolveEditorComponent(assetNode("displays"))?.type).toBe(
            AssetListPanel,
        );
        expect(resolveEditorComponent(assetNode("styles"))?.type).toBe(
            AssetCategoryEditor,
        );
        expect(resolveEditorComponent(assetNode("glyphs"))?.type).toBe(
            AssetCategoryEditor,
        );
    });
});

