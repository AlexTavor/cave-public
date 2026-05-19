import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import { Ticker } from "../../../engine/runtime/Ticker";
import { createPersistenceActions } from "./persistenceSlice";
import { createCameraActions } from "./cameraSlice";
import { createSimulationActions } from "./simulationSlice";
import { buildRuntime } from "./runtimeFactory";
import { resetRuntimeUiState } from "./resetRuntimeUiState";
import { registerRuntimeStoreAccessor } from "./runtimeStoreAccessor";
import { workspaceService } from "../../../engine/terminal/commands/projectServices";
import { toModuleCartridge } from "../../../engine/terminal/commands/projectCartridgeAdapter";
import {
  extractTutorialMode,
  readStoredTutorialMode,
  restoreTutorialMode,
} from "../tutorials/tutorialModeMemory";
import type {
  RuntimeStoreState,
  RuntimeStoreActions,
} from "./runtimeStoreTypes";

export const useRuntimeStore = create<
  RuntimeStoreState & RuntimeStoreActions
>()(
  immer((set, get) => {
    const ticker = new Ticker();

    const teardownRuntime = (): void => {
      ticker.stop();
      ticker.setCallback(null);
      get().runtime?.destroy();
    };

    return {
      runtime: null,
      status: "idle",
      timeScale: 1,
      availableSaves: [],
      currentSaveName: null,
      cameraState: null,
      pendingCameraRestore: null,
      cameraRevision: 0,
      ...createCameraActions(set, get),
      ...createSimulationActions(set, get, ticker),
      ...createPersistenceActions(set, () => ({
        runtime: get().runtime,
        currentSaveName: get().currentSaveName,
        cameraState: get().cameraState,
        loadCartridge: get().loadCartridge,
        setPendingCameraRestore: get().setPendingCameraRestore,
        getManifestPath: () => workspaceService.getManifestPath(),
        resolveCartridge: async (manifestPath?: string) => {
          if (
            manifestPath &&
            workspaceService.getManifestPath() !== manifestPath
          ) {
            await workspaceService.loadProject(manifestPath);
          }
          if (workspaceService.activeCartridge) {
            return toModuleCartridge(workspaceService.activeCartridge);
          }
          const runtime = get().runtime;
          if (!runtime) {
            throw new Error("Cannot resolve cartridge without a runtime.");
          }
          return runtime.getCartridge();
        },
      })),

      loadCartridge: (cartridge, seed) => {
        teardownRuntime();
        resetRuntimeUiState();
        const runtime = buildRuntime(cartridge, seed ?? nanoid(), ticker, get);
        runtime.setTimeScale(get().timeScale);
        restoreTutorialMode(runtime, readStoredTutorialMode());
        set((state) => {
          state.runtime = runtime;
          state.status = "paused";
          state.cameraRevision = 0;
          state.pendingCameraRestore = null;
        });
      },
      unload: () => {
        teardownRuntime();
        resetRuntimeUiState();
        set((state) => {
          state.runtime = null;
          state.status = "idle";
          state.cameraRevision = 0;
          state.pendingCameraRestore = null;
        });
      },
      reset: () => {
        const runtime = get().runtime;
        if (!runtime) return;
        ticker.stop();
        const tutorialMode = extractTutorialMode(runtime);
        runtime.reset();
        restoreTutorialMode(runtime, tutorialMode);
        resetRuntimeUiState();
        set((state) => {
          state.status = "paused";
          state.cameraRevision = 0;
          state.pendingCameraRestore = null;
        });
      },
    };
  }),
);

registerRuntimeStoreAccessor(() => useRuntimeStore.getState());
