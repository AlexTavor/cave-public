import { useMemo } from "react";
import { RuntimeProvider } from "../../../lib/terminal";
import { useRuntimeStore } from "../../runtime/state/useRuntimeStore";

export function useRuntimeAdapter(): RuntimeProvider {
    // We use getState() inside the methods to ensure we always get fresh data
    // without forcing the terminal hook to re-render on every tick.
    return useMemo(
        () => ({
            getRuntime: () => useRuntimeStore.getState().runtime,
            loadCartridge: (cartridge, seed) => {
                useRuntimeStore.getState().loadCartridge(cartridge, seed);
            },
            play: () => {
                useRuntimeStore.getState().play();
            },
            pause: () => {
                useRuntimeStore.getState().pause();
            },
            step: () => useRuntimeStore.getState().step(),
            unload: () => {
                useRuntimeStore.getState().unload();
            },
            getActiveEntityIds: () => {
                const runtime = useRuntimeStore.getState().runtime;
                if (!runtime) return [];
                return runtime
                    .getEntities()
                    .map((e) => e.id)
                    .filter((id): id is string => !!id);
            },
            getLoadedBlueprintIds: () => {
                const runtime = useRuntimeStore.getState().runtime;
                if (!runtime) return [];
                const cartridge = runtime.getCartridge();
                return Object.keys(cartridge.blueprints || {});
            },
        }),
        [],
    );
}
