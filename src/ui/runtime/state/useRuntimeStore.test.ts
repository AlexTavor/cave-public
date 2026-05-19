import { describe, it, expect, beforeEach, vi } from "vitest";
import { useRuntimeStore } from "./useRuntimeStore";
import type { ModuleCartridge } from "../../../data/schemas/module";
import { DEFAULT_GAME_CONFIG } from "../../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../../../data/schemas/assets";

vi.mock("../../../game/services/SaveGameService", () => ({
    SaveGameService: {
        save: vi.fn(() => Promise.resolve()),
        load: vi.fn(() => Promise.resolve(null)),
        list: vi.fn(() => Promise.resolve([])),
        remove: vi.fn(() => Promise.resolve()),
    },
}));

vi.mock("../../../engine/terminal/commands/projectServices", () => ({
    workspaceService: {
        getManifestPath: vi.fn(() => null),
        loadProject: vi.fn(() => Promise.resolve()),
        activeCartridge: null,
    },
}));

vi.mock("../../../engine/terminal/commands/projectCartridgeAdapter", () => ({
    toModuleCartridge: vi.fn((c: unknown) => c),
}));

const makeModule = (): ModuleCartridge => ({
    metadata: {
        id: "core.json",
        name: "Core",
        version: "0.0.1",
    },
    blueprints: {},
    assets: {
        displays: {},
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

describe("useRuntimeStore", () => {
    beforeEach(() => {
        useRuntimeStore.getState().unload();
    });

    it("loads and unloads a runtime", () => {
        const store = useRuntimeStore.getState();

        store.loadCartridge(makeModule(), "seed");
        expect(useRuntimeStore.getState().runtime).not.toBeNull();
        expect(useRuntimeStore.getState().cameraRevision).toBe(0);

        store.unload();
        expect(useRuntimeStore.getState().runtime).toBeNull();
        expect(useRuntimeStore.getState().cameraRevision).toBe(0);
    });

    it("destroys existing runtime on reload", () => {
        const store = useRuntimeStore.getState();

        store.loadCartridge(makeModule(), "seed");
        const firstRuntime = useRuntimeStore.getState().runtime;
        const destroySpy = vi.spyOn(firstRuntime!, "destroy");
        store.loadCartridge(makeModule(), "seed-2");

        expect(destroySpy).toHaveBeenCalledTimes(1);
        destroySpy.mockRestore();
    });

    it("updates time scale and syncs to runtime", () => {
        const store = useRuntimeStore.getState();

        store.loadCartridge(makeModule(), "seed");
        const runtime = useRuntimeStore.getState().runtime!;
        const timeScaleSpy = vi.spyOn(runtime, "setTimeScale");
        store.setTimeScale(2.5);

        expect(useRuntimeStore.getState().timeScale).toBe(2.5);
        expect(timeScaleSpy).toHaveBeenCalled();
        timeScaleSpy.mockRestore();
    });

    it("resets camera revision on reset", () => {
        const store = useRuntimeStore.getState();
        store.loadCartridge(makeModule(), "seed");
        store.setCameraState({ centerX: 1, centerY: 2, zoom: 3 });

        store.reset();

        expect(useRuntimeStore.getState().cameraRevision).toBe(0);
    });

    it("seeds fresh runtimes from stored tutorial mode", () => {
        vi.stubGlobal("localStorage", {
            getItem: vi.fn(() => "0"),
            setItem: vi.fn(),
        });
        const store = useRuntimeStore.getState();

        store.loadCartridge(makeModule(), "seed");

        expect(
            (useRuntimeStore.getState().runtime?.getEntity("sys_world") as any)
                ?.state?.tutorial_mode?.value,
        ).toBe(0);
    });
});

