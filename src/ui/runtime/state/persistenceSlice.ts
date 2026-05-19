import { serialize } from "../../../engine/runtime/persistence/RuntimeSerializer";
import { SaveGameService } from "../../../game/services/SaveGameService";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { useRuntimeToolStore } from "./useRuntimeToolStore";
import { readSavedSelectedEntityId } from "./readSavedSelectedEntityId";
import type {
    PersistenceSliceState,
    PersistenceSliceActions,
    PersistenceHost,
} from "./persistenceSlice.types";

export type { PersistenceSliceState, PersistenceSliceActions, PersistenceHost };

export const createPersistenceActions = (
    set: (fn: (s: PersistenceSliceState) => void) => void,
    getHost: () => PersistenceHost,
): PersistenceSliceActions => ({
    fetchSaves: async () => {
        const names = await SaveGameService.list();
        set((s) => {
            s.availableSaves = names;
        });
    },

    saveGame: async (name?: string) => {
        const { runtime, currentSaveName } = getHost();
        const targetName = name ?? currentSaveName;
        if (!targetName)
            throw new Error("No save name provided and no current save exists");
        if (!runtime) throw new Error("Cannot save: No active runtime");

        const manifestPath = getHost().getManifestPath() ?? undefined;
        const camera = getHost().cameraState ?? undefined;
        const data = serialize(runtime, targetName, manifestPath, camera);
        await SaveGameService.save(targetName, data);

        set((s) => {
            s.currentSaveName = targetName;
        });

        const names = await SaveGameService.list();
        set((s) => {
            s.availableSaves = names;
        });
    },

    loadGame: async (name?: string) => {
        const { currentSaveName } = getHost();
        const targetName = name ?? currentSaveName;
        if (!targetName)
            throw new Error("No save name provided and no current save exists");

        const data = await SaveGameService.load(targetName);
        if (!data) throw new Error("Save file not found");

        const cartridge = await getHost().resolveCartridge(
            data.metadata.manifestPath,
        );
        getHost().loadCartridge(cartridge, data.metadata.seed);
        useRuntimeToolStore
            .getState()
            .selectEntity(readSavedSelectedEntityId(data));

        const freshRuntime = getHost().runtime;
        if (!freshRuntime) throw new Error("Runtime failed to reinitialize");
        freshRuntime.hydrate(data);
        const cave = (freshRuntime.getEntity("sys_world") as any)?.cave;
        freshRuntime.commands.enqueue({
            type: RuntimeCommandType.UPDATE_CAVE,
            payload: {
                entityId: "sys_world",
                ownedHabiti: Array.isArray(cave?.ownedHabiti)
                    ? cave.ownedHabiti
                    : [],
                ownedUnderstanding: Array.isArray(cave?.ownedUnderstanding)
                    ? cave.ownedUnderstanding
                    : [],
            },
        });
        freshRuntime.flushCommands();

        if (data.state.camera) {
            getHost().setPendingCameraRestore(data.state.camera);
        }

        set((s) => {
            s.currentSaveName = targetName;
        });
    },

    deleteSave: async (name: string) => {
        await SaveGameService.remove(name);
        const names = await SaveGameService.list();
        set((s) => {
            s.availableSaves = names;
            if (s.currentSaveName === name) s.currentSaveName = null;
        });
    },
});

