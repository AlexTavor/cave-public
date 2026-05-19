import type { ExecutionContextInput } from "../lib/terminal";
import { useShellStore } from "../ui/devtools/shell/shell";
import { useRuntimeStore } from "../ui/runtime/state/useRuntimeStore";

const runtime = () => useRuntimeStore.getState();

export const createShellCommandContext = (): ExecutionContextInput => ({
    runtime: {
        getRuntime: () => runtime().runtime,
        loadCartridge: (cartridge, seed) =>
            runtime().loadCartridge(cartridge, seed),
        play: () => runtime().play(),
        pause: () => runtime().pause(),
        step: () => runtime().step(),
        unload: () => runtime().unload(),
        reset: () => runtime().reset(),
        getActiveEntityIds: () =>
            runtime()
                .runtime?.getEntities()
                .flatMap((entity) => (entity.id ? [entity.id] : [])) ?? [],
        getLoadedBlueprintIds: () =>
            Object.keys(runtime().runtime?.getCartridge().blueprints ?? {}),
    },
    ui: {
        openFile: (path) => useShellStore.getState().openFile(path),
        closeFile: (path) => useShellStore.getState().closeFile(path),
        onProjectLoaded: (path) =>
            useShellStore.getState().setActiveManifest(path),
    },
});
