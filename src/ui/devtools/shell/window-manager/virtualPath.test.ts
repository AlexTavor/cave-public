import { describe, it, expect } from "vitest";
import type { TabNode } from "flexlayout-react";
import { ASSET_CATEGORY_DISPLAYS } from "../../state/moduleStore.assets";
import {
    getVirtualPathFromNode,
    parseVirtualPath,
    serializeVirtualPath,
} from "./virtualPath";

describe("virtualPath", () => {
    it("parses asset paths", () => {
        const result = parseVirtualPath("game.json::assets::displays::wraith");
        expect(result).toEqual({
            kind: "asset",
            filename: "game.json",
            category: ASSET_CATEGORY_DISPLAYS,
            assetId: "wraith",
        });
    });

    it("parses blueprint paths", () => {
        const result = parseVirtualPath("game.json::blueprints::entity_1");
        expect(result).toEqual({
            kind: "blueprint",
            filename: "game.json",
            blueprintId: "entity_1",
        });
    });

    it("parses metadata paths", () => {
        const result = parseVirtualPath("game.json::metadata");
        expect(result).toEqual({
            kind: "meta",
            filename: "game.json",
        });
    });

    it("parses list and physics routes", () => {
        expect(parseVirtualPath("list::game.json::blueprints")).toEqual({
            kind: "list",
            filename: "game.json",
            section: "blueprints",
        });
        expect(parseVirtualPath("list::game.json::assets::displays")).toEqual({
            kind: "list",
            filename: "game.json",
            section: "assets",
            category: ASSET_CATEGORY_DISPLAYS,
        });
        expect(parseVirtualPath("physics::game.json")).toEqual({
            kind: "physics",
            filename: "game.json",
        });
    });

    it("migrates legacy blueprint paths", () => {
        const result = parseVirtualPath("game.json::entity_1");
        expect(result).toEqual({
            kind: "blueprint",
            filename: "game.json",
            blueprintId: "entity_1",
        });
    });

    it("parses module paths without sub-id", () => {
        const result = parseVirtualPath("module::game.json");
        expect(result).toEqual({ kind: "module", filename: "game.json" });
        const legacy = parseVirtualPath("game.json");
        expect(legacy).toEqual({ kind: "module", filename: "game.json" });
    });

    it("parses nested cvs file paths as module files", () => {
        const result = parseVirtualPath("scripts/init.cvs");
        expect(result).toEqual({
            kind: "module",
            filename: "scripts/init.cvs",
        });
    });

    it("serializes asset nodes", () => {
        const node = {
            getConfig: () => ({
                filename: "game.json",
                category: ASSET_CATEGORY_DISPLAYS,
                assetId: "wraith",
            }),
            getComponent: () => "asset",
        } as unknown as TabNode;

        const result = getVirtualPathFromNode(node);
        expect(result).toBe("game.json::assets::displays::wraith");
    });

    it("round-trips list routes", () => {
        const path = serializeVirtualPath({
            kind: "list",
            filename: "game.json",
            section: "assets",
            category: ASSET_CATEGORY_DISPLAYS,
        });
        expect(parseVirtualPath(path)).toEqual({
            kind: "list",
            filename: "game.json",
            section: "assets",
            category: ASSET_CATEGORY_DISPLAYS,
        });
    });

    it("round-trips config routes", () => {
        for (const kind of [
            "game_config",
            "background_config",
            "vein_config",
        ] as const) {
            const path = serializeVirtualPath({
                kind,
                filename: "game.json",
            });
            expect(parseVirtualPath(path)).toEqual({
                kind,
                filename: "game.json",
            });
        }
    });
});

