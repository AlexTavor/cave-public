import { describe, it, expect, vi, beforeEach } from "vitest";
import { useRuntimeStore } from "./useRuntimeStore";

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

vi.mock("../../../engine/runtime/persistence/RuntimeSerializer", () => ({
    serialize: vi.fn(() => ({
        metadata: {
            version: "2",
            timestamp: 0,
            label: "test",
            seed: "s",
        },
        state: {
            tick: 0,
            timeScale: 1,
            entities: [],
            physics: {},
            systems: {
                automation: {
                    activeCount: 0,
                    nextEventMs: null,
                    nextCommand: null,
                },
            },
        },
    })),
}));

describe("useRuntimeStore persistence", () => {
    beforeEach(() => {
        useRuntimeStore.getState().unload();
        useRuntimeStore.setState({
            currentSaveName: null,
            availableSaves: [],
        });
    });

    it("rejects saveGame without name or currentSaveName", async () => {
        // Given: fresh store, no runtime, no currentSaveName

        // When / Then
        await expect(useRuntimeStore.getState().saveGame()).rejects.toThrow(
            "No save name provided",
        );
    });

    it("rejects saveGame when runtime is null", async () => {
        // Given: no runtime loaded
        useRuntimeStore.setState({ currentSaveName: "fallback" });

        // When / Then
        await expect(useRuntimeStore.getState().saveGame()).rejects.toThrow(
            "Cannot save",
        );
    });

    it("rejects loadGame without name or currentSaveName", async () => {
        // Given: no currentSaveName

        // When / Then
        await expect(useRuntimeStore.getState().loadGame()).rejects.toThrow(
            "No save name provided",
        );
    });

    it("fetchSaves updates availableSaves", async () => {
        // Given
        const { SaveGameService } =
            await import("../../../game/services/SaveGameService");
        vi.mocked(SaveGameService.list).mockResolvedValueOnce(["a", "b"]);

        // When
        await useRuntimeStore.getState().fetchSaves();

        // Then
        expect(useRuntimeStore.getState().availableSaves).toEqual(["a", "b"]);
    });

    it("deleteSave clears currentSaveName when matching", async () => {
        // Given
        useRuntimeStore.setState({ currentSaveName: "doomed" });

        // When
        await useRuntimeStore.getState().deleteSave("doomed");

        // Then
        expect(useRuntimeStore.getState().currentSaveName).toBeNull();
    });
});
