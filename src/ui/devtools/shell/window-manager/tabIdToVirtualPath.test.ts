import { describe, expect, it } from "vitest";
import { tabIdToVirtualPath } from "./tabIdToVirtualPath";

describe("tabIdToVirtualPath", () => {
    it("maps file tabs to decoded paths", () => {
        expect(tabIdToVirtualPath("file:folder%2Fmanifest.json")).toBe(
            "folder/manifest.json",
        );
    });

    it("maps simple route tabs", () => {
        expect(tabIdToVirtualPath("meta:game%2Ejson")).toBe("meta::game.json");
        expect(tabIdToVirtualPath("physics:game%2Ejson")).toBe(
            "physics::game.json",
        );
        expect(tabIdToVirtualPath("options:game%2Ejson")).toBe(
            "options::game.json",
        );
        expect(tabIdToVirtualPath("game_config:game%2Ejson")).toBe(
            "game_config::game.json",
        );
        expect(tabIdToVirtualPath("background_config:game%2Ejson")).toBe(
            "background_config::game.json",
        );
        expect(tabIdToVirtualPath("conditions:game%2Ejson")).toBe(
            "conditions::game.json",
        );
        expect(tabIdToVirtualPath("guidances:game%2Ejson")).toBe(
            "guidances::game.json",
        );
        expect(tabIdToVirtualPath("tutorials:game%2Ejson")).toBe(
            "tutorials::game.json",
        );
        expect(tabIdToVirtualPath("knowledge:game%2Ejson")).toBe(
            "knowledge::game.json",
        );
        expect(tabIdToVirtualPath("vein_config:game%2Ejson")).toBe(
            "vein_config::game.json",
        );
        expect(tabIdToVirtualPath("camera_world:game%2Ejson")).toBe(
            "camera_world::game.json",
        );
        expect(tabIdToVirtualPath("carrier:game%2Ejson")).toBe(
            "carrier::game.json",
        );
    });

    it("maps list and entity tabs", () => {
        expect(tabIdToVirtualPath("list:blueprints:game%2Ejson")).toBe(
            "list::game.json::blueprints",
        );
        expect(tabIdToVirtualPath("list:assets:game%2Ejson:displays")).toBe(
            "list::game.json::assets::displays",
        );
        expect(tabIdToVirtualPath("pool:game%2Ejson:start")).toBe(
            "pool::game.json::start",
        );
        expect(tabIdToVirtualPath("bp:game%2Ejson:runner")).toBe(
            "game.json::blueprints::runner",
        );
        expect(tabIdToVirtualPath("asset:game%2Ejson:displays:hero")).toBe(
            "game.json::assets::displays::hero",
        );
    });

    it("returns null for non-routable tabs", () => {
        expect(tabIdToVirtualPath("home")).toBeNull();
        expect(tabIdToVirtualPath("terminal")).toBeNull();
        expect(tabIdToVirtualPath("asset:game%2Ejson:sprites:hero")).toBeNull();
    });
});

