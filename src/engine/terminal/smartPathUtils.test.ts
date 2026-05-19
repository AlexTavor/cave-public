import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { CommandRegistry } from "../../lib/terminal/Registry";
import type { ExecutionContext } from "../../lib/terminal";
import type { ModuleCartridge } from "../../data/schemas/module";
import type { Blueprint } from "../../data/schemas/blueprint";
import { DEFAULT_GAME_CONFIG } from "../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../../data/schemas/assets";
import { fileCache } from "./fileUtils";
import { getMultipartSuggestions } from "./smartPathUtils";

const registry = new CommandRegistry();

const mockModule: ModuleCartridge = {
    metadata: { id: "game.json", name: "Game", version: "0.0.1" },
    assets: {
        displays: {
            wraith: { type: "resource", styleId: "spirit", glyphKey: "ghost" },
        },
        resources: {},
        styles: {},
        traits: {},
        settings: {
            impulse: DEFAULT_IMPULSE_CONFIG,
            game_config: DEFAULT_GAME_CONFIG,
            vein_network: DEFAULT_VEIN_CONFIG,
        },
    },
    blueprints: {
        entity_g: {
            id: "entity_g",
            label: "Goblin",
            tags: [],
            components: {},
        } as Blueprint,
        entity_2: {
            id: "entity_2",
            label: "",
            tags: [],
            components: { display: { label: "Villager", display_key: "🧙‍♂️" } },
        } as Blueprint,
    },
};

const mockContext: ExecutionContext = {
    registry,
    resources: {
        hasFile: (filename) => filename === "game.json",
        getModule: (filename) => (filename === "game.json" ? mockModule : null),
        resolveModuleKeys: (filename, category) => {
            if (filename !== "game.json") return [];
            if (category === "displays") return ["wraith", "warrior"];
            if (category === "blueprints") return ["entity_g", "entity_2"];
            return [];
        },
    },
};

const originalCache = [...fileCache];

beforeEach(() => {
    fileCache.length = 0;
    fileCache.push("game.json");
});

afterEach(() => {
    fileCache.length = 0;
    fileCache.push(...originalCache);
});

describe("engine/terminal/smartPathUtils", () => {
    it("suggests structural roots on exact file match", () => {
        const suggestions = getMultipartSuggestions(["game.json"], mockContext);

        expect(suggestions.some((s) => s.label === "metadata")).toBe(true);
        expect(suggestions.some((s) => s.label === "assets")).toBe(true);
        expect(suggestions.some((s) => s.label === "blueprints")).toBe(true);
    });

    it("returns rich blueprint labels", () => {
        const suggestions = getMultipartSuggestions(
            ["game.json::blueprints::"],
            mockContext,
        );

        const goblin = suggestions.find((s) => s.label === "Goblin");
        expect(goblin).toBeDefined();
        expect(goblin?.description).toBe("entity_g");
        expect(goblin?.insertText).toBe("game.json::blueprints::entity_g");
    });

    it("deep walks assets categories", () => {
        const suggestions = getMultipartSuggestions(
            ["game.json::assets::"],
            mockContext,
        );

        const displays = suggestions.find((s) => s.label === "displays");
        expect(displays).toBeDefined();
        expect(displays?.insertText).toBe("game.json::assets::displays::");
    });

    it("terminates suggestions when a leaf id is resolved", () => {
        const suggestions = getMultipartSuggestions(
            ["game.json::assets::displays::wraith"],
            mockContext,
        );
        expect(suggestions).toHaveLength(0);
    });
});

