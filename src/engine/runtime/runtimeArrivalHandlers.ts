import type { World } from "miniplex";
import type { ArrivalEvent } from "../physics/impulse/types";
import type { CommandBuffer, RuntimeCommand, RuntimeEntity } from "./types";
import { RuntimeCommandType } from "./types";

export const handleArrivals = (
    arrivals: ArrivalEvent[],
    world: World<RuntimeEntity>,
    commands: CommandBuffer<RuntimeCommand>,
): void => {
    for (const arrival of arrivals) {
        const entity = world.entities.find(
            (candidate) => candidate.id === arrival.bodyId,
        );
        if (!entity) continue;

        if ((entity as { transfer?: unknown }).transfer) {
            commands.enqueue({
                type: RuntimeCommandType.RESOLVE_TRANSFER,
                payload: { entityId: arrival.bodyId },
            });
            commands.enqueue({
                type: RuntimeCommandType.SET_TARGET,
                payload: { entityId: arrival.bodyId, targetId: null },
            });
        }
    }
};

