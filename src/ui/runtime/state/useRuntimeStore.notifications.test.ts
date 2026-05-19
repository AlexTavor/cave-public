import { beforeEach, describe, expect, it, vi } from "vitest";
import { runtimeNotificationStore } from "../notifications/runtimeNotificationStore";
import { runStartCycleBannerStore } from "../status/runStartCycleBannerStore";
import { useRuntimeStore } from "./useRuntimeStore";
import { DEFAULT_GAME_CONFIG } from "../../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../../../data/schemas/assets";

vi.mock("../../../game/services/SaveGameService", () => ({
    SaveGameService: {
        save: vi.fn(),
        load: vi.fn(),
        list: vi.fn(() => Promise.resolve([])),
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

describe("useRuntimeStore notification reset", () => {
    beforeEach(() => {
        useRuntimeStore.getState().unload();
        runtimeNotificationStore.getState().reset();
        runStartCycleBannerStore.getState().reset();
    });

    it("clears stale notification UI on load, reset, and unload", () => {
        // Given
        runtimeNotificationStore.getState().applyEventBatch(
            [
                {
                    kind: "body_added",
                    aggregationKey: "body_added",
                    count: 1,
                },
            ],
            0,
        );

        // When
        useRuntimeStore.getState().loadCartridge(makeModule() as any, "seed");
        runtimeNotificationStore.getState().applyEventBatch(
            [
                {
                    kind: "body_added",
                    aggregationKey: "body_added",
                    count: 1,
                },
            ],
            0,
        );
        useRuntimeStore.getState().reset();
        runtimeNotificationStore.getState().applyEventBatch(
            [
                {
                    kind: "body_added",
                    aggregationKey: "body_added",
                    count: 1,
                },
            ],
            0,
        );
        runStartCycleBannerStore.getState().show(3);
        useRuntimeStore.getState().unload();

        // Then
        expect(runtimeNotificationStore.getState().eventItems).toEqual([]);
        expect(runStartCycleBannerStore.getState().banner).toBeNull();
    });
});
