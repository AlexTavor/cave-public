import { beforeEach, describe, expect, it, vi } from "vitest";
import { runtimeInspectorStore } from "../inspector/runtimeInspectorStore";
import { useRuntimeStore } from "./useRuntimeStore";
import { DEFAULT_GAME_CONFIG } from "../../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../../../data/schemas/assets";

vi.mock("../../../game/services/SaveGameService", () => ({
    SaveGameService: {
        save: vi.fn(),
        load: vi.fn(),
        list: vi.fn(() => []),
        remove: vi.fn(),
    },
}));
vi.mock("../../../engine/terminal/commands/projectServices", () => ({
    workspaceService: {
        getManifestPath: vi.fn(() => null),
        loadProject: vi.fn(),
        activeCartridge: null,
    },
}));
vi.mock("../../../engine/terminal/commands/projectCartridgeAdapter", () => ({
    toModuleCartridge: vi.fn((value) => value),
}));

const makeModule = () => ({
    metadata: { id: "core", name: "Core", version: "0.0.1" },
    blueprints: {},
    assets: {
        icons: {},
        resources: {},
        styles: {},
        traits: {},
        settings: {
            impulse: DEFAULT_IMPULSE_CONFIG,
            game_config: DEFAULT_GAME_CONFIG,
            vein_network: DEFAULT_VEIN_CONFIG,
        },
    },
});

describe("useRuntimeStore inspector reset", () => {
    beforeEach(() => {
        useRuntimeStore.getState().unload();
        runtimeInspectorStore.getState().reset();
    });

    it("clears stale inspector UI on load, reset, and unload", () => {
        runtimeInspectorStore.getState().syncSelection("body-1");
        useRuntimeStore.getState().loadCartridge(makeModule() as any, "seed");
        runtimeInspectorStore.getState().syncSelection("body-1");
        useRuntimeStore.getState().reset();
        runtimeInspectorStore.getState().syncSelection("body-1");
        useRuntimeStore.getState().unload();
        expect(runtimeInspectorStore.getState().windows).toEqual([]);
    });
});
