import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPersistenceActions } from "./persistenceSlice";
import { SaveGameService } from "../../../game/services/SaveGameService";
import { useRuntimeToolStore } from "./useRuntimeToolStore";

vi.mock("../../../game/services/SaveGameService", () => ({
    SaveGameService: { load: vi.fn(), list: vi.fn().mockResolvedValue([]) },
}));

describe("persistenceSlice selection sync", () => {
    beforeEach(() => {
        useRuntimeToolStore.getState().selectEntity(null);
    });

    it("hydrates the saved selected entity into the tool store", async () => {
        vi.mocked(SaveGameService.load).mockResolvedValue({
            metadata: { seed: "1" },
            state: {
                entities: [
                    {
                        id: "sys_world",
                        state: { cave_selected_entity_id: { value: "egg" } },
                    },
                ],
            },
        } as any);
        const runtime = {
            hydrate: vi.fn(),
            commands: { enqueue: vi.fn() },
            flushCommands: vi.fn(),
            getEntity: () => ({ cave: {} }),
        } as any;
        const actions = createPersistenceActions(vi.fn(), () => ({
            runtime,
            currentSaveName: null,
            cameraState: null,
            loadCartridge: vi.fn(),
            setPendingCameraRestore: vi.fn(),
            getManifestPath: () => null,
            resolveCartridge: vi.fn().mockResolvedValue({}),
        }));

        await actions.loadGame("autosave");

        expect(useRuntimeToolStore.getState().selectedEntityId).toBe("egg");
    });
});
