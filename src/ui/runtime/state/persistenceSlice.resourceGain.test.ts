import { describe, expect, it, vi } from "vitest";
import { createPersistenceActions } from "./persistenceSlice";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { SaveGameService } from "../../../game/services/SaveGameService";

vi.mock("../../../game/services/SaveGameService", () => ({
    SaveGameService: { load: vi.fn(), list: vi.fn().mockResolvedValue([]) },
}));

describe("persistenceSlice resource gain sync", () => {
    it("replays UPDATE_CAVE after hydrate", async () => {
        const enqueue = vi.fn();
        const flushCommands = vi.fn();
        const hydrate = vi.fn();
        const runtime = {
            hydrate,
            commands: { enqueue },
            flushCommands,
            getEntity: () => ({
                cave: {
                    ownedHabiti: ["woods"],
                    ownedUnderstanding: ["insight"],
                },
            }),
        } as any;
        vi.mocked(SaveGameService.load).mockResolvedValue({
            metadata: { seed: "1" },
            state: {},
        } as any);
        const actions = createPersistenceActions(vi.fn(), () => ({
            runtime,
            currentSaveName: null,
            cameraState: null,
            loadCartridge: vi.fn(),
            setPendingCameraRestore: vi.fn(),
            getManifestPath: () => null,
            resolveCartridge: vi.fn().mockResolvedValue({}),
        }));

        await actions.loadGame("save-1");

        expect(enqueue).toHaveBeenCalledWith({
            type: RuntimeCommandType.UPDATE_CAVE,
            payload: {
                entityId: "sys_world",
                ownedHabiti: ["woods"],
                ownedUnderstanding: ["insight"],
            },
        });
        expect(flushCommands).toHaveBeenCalledTimes(1);
    });
});
