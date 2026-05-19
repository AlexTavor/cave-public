import {
    PHYSICS_DEFAULT_X,
    PHYSICS_DEFAULT_Y,
} from "../../../data/schemas/physics";
import type { RuntimeEntity } from "../types";
import type { CommandHandlerContext } from "./types";
import { resolvePhysicsPosition } from "./transferBodies";

export interface PendingTransferSpawn {
    spawn: { x: number; y: number };
    direction?: { x: number; y: number };
}

const resolveBodyPosition = (
    entity: RuntimeEntity,
    body: { position: { x: number; y: number } } | null,
) =>
    body
        ? { x: body.position.x, y: body.position.y }
        : (resolvePhysicsPosition(entity) ?? {
              x: PHYSICS_DEFAULT_X,
              y: PHYSICS_DEFAULT_Y,
          });

export const resolvePendingTransferSpawn = (params: {
    source: RuntimeEntity;
    target: RuntimeEntity;
    context: CommandHandlerContext;
}): PendingTransferSpawn => {
    const { source, target, context } = params;
    const sourceId = source.id ?? "";
    const targetId = target.id ?? "";
    const sourceBody = sourceId
        ? (context.impulseEngine.getBody(sourceId) ?? null)
        : null;
    const targetBody = targetId
        ? (context.impulseEngine.getBody(targetId) ?? null)
        : null;
    const sourcePos = resolveBodyPosition(source, sourceBody);
    const targetPos = resolveBodyPosition(target, targetBody);
    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    const dist = Math.hypot(dx, dy);
    const isDistinct = sourceId !== targetId && dist > 1;
    if (!isDistinct) return { spawn: sourcePos };

    const direction = { x: dx / dist, y: dy / dist };
    const sourceRadius = sourceBody?.radius ?? 20;
    return {
        spawn: {
            x: sourcePos.x + direction.x * (sourceRadius + 2),
            y: sourcePos.y + direction.y * (sourceRadius + 2),
        },
        direction,
    };
};
