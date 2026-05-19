import type { System } from "../../engine/runtime/systems/System";
import type { Snapshot } from "../../engine/runtime/Snapshot";
import type { CommandBuffer, RuntimeCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { hasCarrierArrived, isCarrierEntity } from "../carriers/carrier";
import {
    hasReachedCave,
    resolveCarrierOrbitPosition,
} from "../carriers/carrierMotion";

const readPosition = (entity: { physics?: { x?: number; y?: number } }) => ({
    x: entity.physics?.x ?? 0,
    y: entity.physics?.y ?? 0,
});

export class CarrierSystem implements System {
    private elapsedMs = 0;

    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
        dt: number,
    ) {
        this.elapsedMs += dt;
        const caveBody = snapshot.getPhysicsBody("sys_world");
        if (!caveBody) return;
        const carriers = snapshot
            .getEntities()
            .filter(isCarrierEntity)
            .sort((a, b) => (a.id ?? "").localeCompare(b.id ?? ""));
        carriers.forEach((entity, index) => {
            const entityId = entity.id;
            if (!entityId) return;
            const body = snapshot.getPhysicsBody(entityId);
            if (!body) {
                commands.enqueue({
                    type: RuntimeCommandType.SPAWN_CARRIER,
                    payload: {
                        id: entityId,
                        ...readPosition(entity as any),
                        arrived: hasCarrierArrived(entity),
                        tags: [...(entity.tags ?? [])],
                        commands: entity.carrier.commands,
                    },
                });
                return;
            }
            if (!hasCarrierArrived(entity)) {
                body.layer !== "default" &&
                    commands.enqueue({
                        type: RuntimeCommandType.SET_PHYSICS_LAYER,
                        payload: { entityId, layer: "default" },
                    });
                commands.enqueue({
                    type: RuntimeCommandType.SET_TARGET,
                    payload: { entityId, targetId: "sys_world" },
                });
                if (!hasReachedCave(body, caveBody)) return;
                commands.enqueue({
                    type: RuntimeCommandType.SET_TARGET,
                    payload: { entityId, targetId: null },
                });
                commands.enqueue({
                    type: RuntimeCommandType.UPDATE_STATE,
                    payload: {
                        entityId,
                        key: "carrier_arrived",
                        value: 1,
                        visible: false,
                    },
                });
                return;
            }
            body.targetId &&
                commands.enqueue({
                    type: RuntimeCommandType.SET_TARGET,
                    payload: { entityId, targetId: null },
                });
            body.layer !== "phantom" &&
                commands.enqueue({
                    type: RuntimeCommandType.SET_PHYSICS_LAYER,
                    payload: { entityId, layer: "phantom" },
                });
            commands.enqueue({
                type: RuntimeCommandType.POSITION_ENTITY,
                payload: {
                    id: entityId,
                    ...resolveCarrierOrbitPosition(
                        caveBody,
                        carriers.length,
                        index,
                        this.elapsedMs,
                    ),
                },
            });
        });
    }
}
