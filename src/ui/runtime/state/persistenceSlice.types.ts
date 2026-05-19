import type { Runtime } from "../../../engine/runtime/Runtime";
import type { ModuleCartridge } from "../../../data/schemas/module";
import type { SerializedCameraState } from "../../../engine/runtime/persistence/types";

export interface PersistenceSliceState {
    availableSaves: string[];
    currentSaveName: string | null;
}

export interface PersistenceSliceActions {
    fetchSaves: () => Promise<void>;
    saveGame: (name?: string) => Promise<void>;
    loadGame: (name?: string) => Promise<void>;
    deleteSave: (name: string) => Promise<void>;
}

export interface PersistenceHost {
    runtime: Runtime | null;
    currentSaveName: string | null;
    cameraState: SerializedCameraState | null;
    loadCartridge: (cartridge: ModuleCartridge, seed?: string) => void;
    setPendingCameraRestore: (state: SerializedCameraState | null) => void;
    getManifestPath: () => string | null;
    resolveCartridge: (manifestPath?: string) => Promise<ModuleCartridge>;
}
