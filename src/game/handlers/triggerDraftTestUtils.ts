import { World } from "miniplex";
import { createEntity } from "../../engine/test/factories";
import type { RuntimeEntity } from "../../engine/runtime/types";
import type { DraftComponent } from "../../engine/runtime/components/DraftComponent";

export type DraftWorldEntity = RuntimeEntity & {
    draft?: DraftComponent;
    state?: Record<string, { value: number }>;
};

export const makeWorldWithState = (
    state: Record<string, { value: number }>,
): World<DraftWorldEntity> => {
    const world = new World<DraftWorldEntity>();
    const worldEntity: DraftWorldEntity = createEntity("sys_world", { state });
    world.add(worldEntity);
    return world;
};

export const getWorldEntity = (
    world: World<DraftWorldEntity>,
): DraftWorldEntity => world.entities[0];
