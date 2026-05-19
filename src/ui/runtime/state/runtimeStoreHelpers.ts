import type { Runtime } from "../../../engine/runtime/Runtime";
import { ExecutionContextInput } from "../../../lib/terminal";
import {
    AUTOMATIONS_KEY,
    AUTOMATION_COMMAND_KEY,
    NEXT_AUTOMATION_KEY,
    TICK_KEY,
} from "../terminal/runtimeConstants";
import { useTelemetryStore } from "./useTelemetryStore";
import type { ModuleCartridge } from "../../../data/schemas/module";

export interface RuntimeStoreProxy {
    runtime: Runtime | null;
    loadCartridge: (cartridge: ModuleCartridge, seed?: string) => void;
    play: () => void;
    pause: () => void;
    step: () => number | null;
    reset?: () => void;
}

export const syncTelemetry = (runtime: Runtime): void => {
    const state = runtime.getState();
    const automation = runtime.getAutomationSnapshot();
    const { setSticky } = useTelemetryStore.getState();
    setSticky(TICK_KEY, state.tick);
    setSticky(AUTOMATIONS_KEY, automation.activeCount);
    setSticky(NEXT_AUTOMATION_KEY, automation.nextEventMs ?? "-");
    setSticky(AUTOMATION_COMMAND_KEY, automation.nextCommand ?? "-");
};

export const createAutomationContext = (
    getStore: () => RuntimeStoreProxy,
): ExecutionContextInput => ({
    runtime: {
        getRuntime: () => getStore().runtime,
        loadCartridge: (c, s) => getStore().loadCartridge(c, s),
        play: () => getStore().play(),
        pause: () => getStore().pause(),
        step: () => getStore().step(),
        reset: () => getStore().reset?.(),
        getActiveEntityIds: () => {
            const r = getStore().runtime;
            return r
                ? r
                      .getEntities()
                      .map((e) => e.id!)
                      .filter(Boolean)
                : [];
        },
        getLoadedBlueprintIds: () => {
            const r = getStore().runtime;
            return r ? Object.keys(r.getCartridge().blueprints || {}) : [];
        },
    },
});

