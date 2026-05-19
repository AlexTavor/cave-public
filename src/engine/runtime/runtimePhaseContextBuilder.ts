import type { ModuleCartridge } from "../../data/schemas/module";
import type { RuntimeState } from "./types";
import type { CommandHandlerContext } from "./handlers/types";
import type { ImpulseEngine } from "../physics/impulse/ImpulseEngine";
import type { RuntimeEntityStore } from "./RuntimeEntityStore";
import type { RuntimeSystemsRegistry } from "./RuntimeSystemsRegistry";
import type { CommandsManager } from "./CommandsManager";

export const buildRuntimePhaseContext = (
    entityStore: RuntimeEntityStore,
    commandsManager: CommandsManager,
    impulseEngine: ImpulseEngine,
    commandContext: CommandHandlerContext,
    state: RuntimeState,
    blueprints: ModuleCartridge["blueprints"],
    systemsRegistry: RuntimeSystemsRegistry,
) => ({
    world: entityStore.getWorld(),
    commandsManager,
    commands: commandsManager,
    impulseEngine,
    commandContext,
    state,
    blueprints,
    getSortedEntities: () => entityStore.getEntities(),
    systems: systemsRegistry.getSystems(),
});
