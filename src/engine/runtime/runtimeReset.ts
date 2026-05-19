import type { RuntimeEntityStore } from "./RuntimeEntityStore";
import type { ImpulseEngine } from "../physics/impulse/ImpulseEngine";
import type { CommandsManager } from "./CommandsManager";
import type { RuntimeState } from "./types";
import type { ModuleCartridge } from "../../data/schemas/module";
import { SysConfigSchema } from "../../data/schemas/v2/config";
import { ensureSystemEntities } from "./runtimeWorld";
import { seedPhysicsIntoEngine } from "./runtimePhysicsSeed";
import { ensureWorldSeedState } from "../../utils/worldSeed";

/**
 * Resets ECS + physics state so game.init can re-spawn a fresh world.
 * System entities (sys_world, sys_pointer) are re-seeded after clear.
 */
export const resetRuntimeState = (
    entityStore: RuntimeEntityStore,
    impulseEngine: ImpulseEngine,
    commandsManager: CommandsManager,
    state: RuntimeState,
    cartridge: ModuleCartridge,
): void => {
    for (const entity of entityStore.getEntities()) {
        if (entity.id) impulseEngine.removeBody(entity.id);
    }
    const world = entityStore.getWorld();
    entityStore.clear();
    commandsManager.clear();
    state.tick = 0;
    const config = SysConfigSchema.parse(cartridge.config?.settings ?? {});
    ensureSystemEntities(world, config);
    const worldEntity = world.entities.find(
        (entity) => entity.id === "sys_world",
    ) as any;
    if (worldEntity) ensureWorldSeedState(worldEntity, state.seed);
    seedPhysicsIntoEngine(world, impulseEngine);
};

