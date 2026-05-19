import type { World } from "miniplex";
import type { RuntimeEntity } from "./types";
import type { SysConfig } from "../../data/schemas/v2/config";
import { deepClone } from "../../utils/objectUtils";

const ensureSingleton = (
    world: World<RuntimeEntity>,
    id: string,
    defaults: Record<string, unknown>,
): void => {
    const exists = world.entities.some((e) => e.id === id);
    if (exists) return;
    world.add({ ...deepClone(defaults), id } as RuntimeEntity);
};

export const ensureSystemEntities = (
    world: World<RuntimeEntity>,
    config: SysConfig,
): void => {
    ensureSingleton(world, "sys_world", config.world);
    ensureSingleton(world, "sys_pointer", config.pointer);
};

