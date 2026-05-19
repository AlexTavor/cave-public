import type { ModuleCartridge } from "../../data/schemas/module";
import type { ImpulseEngine } from "../physics/impulse/ImpulseEngine";
import type { CommandsManager } from "./CommandsManager";
import { resetRuntimeState } from "./runtimeReset";
import type { RuntimeEntityStore } from "./RuntimeEntityStore";
import type { RuntimeState } from "./types";

export const resetRuntimeCoreState = (
    entityStore: RuntimeEntityStore,
    impulseEngine: ImpulseEngine,
    commandsManager: CommandsManager,
    state: RuntimeState,
    cartridge: ModuleCartridge,
): void => {
    resetRuntimeState(
        entityStore,
        impulseEngine,
        commandsManager,
        state,
        cartridge,
    );
};

export const destroyRuntimeCoreState = (
    entityStore: RuntimeEntityStore,
    commandsManager: CommandsManager,
    state: RuntimeState,
): void => {
    entityStore.clear();
    commandsManager.clear();
    state.status = "idle";
};
