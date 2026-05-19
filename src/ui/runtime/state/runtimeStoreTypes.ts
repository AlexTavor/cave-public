import type { ModuleCartridge } from "../../../data/schemas/module";
import type { Runtime } from "../../../engine/runtime/Runtime";
import type { RuntimeState } from "../../../engine/runtime/types";
import type { SerializedCameraState } from "../../../engine/runtime/persistence/types";

export type RuntimeStatus = RuntimeState["status"];

export interface RuntimeStoreState {
    runtime: Runtime | null;
    status: RuntimeStatus;
    timeScale: number;
    availableSaves: string[];
    currentSaveName: string | null;
    cameraState: SerializedCameraState | null;
    pendingCameraRestore: SerializedCameraState | null;
    cameraRevision: number;
}

export interface RuntimeStoreActions {
    loadCartridge: (cartridge: ModuleCartridge, seed?: string) => void;
    unload: () => void;
    play: () => void;
    pause: () => void;
    step: () => number | null;
    setTimeScale: (scale: number) => void;
    reset: () => void;
    fetchSaves: () => Promise<void>;
    saveGame: (name?: string) => Promise<void>;
    loadGame: (name?: string) => Promise<void>;
    deleteSave: (name: string) => Promise<void>;
    setCameraState: (state: SerializedCameraState) => void;
    setPendingCameraRestore: (state: SerializedCameraState | null) => void;
    consumePendingCameraRestore: () => SerializedCameraState | null;
}

