import type { PhysicsBody } from "../../physics/impulse/types";
import type { CommandHandlerContext } from "./types";

const syncBodyPosition = (body: PhysicsBody, x: number, y: number): void => {
    body.x = x;
    body.y = y;
    body.position = { x, y };
    body.prevPosition = { x, y };
};

export const resolveSpawnOverlap = (
    body: PhysicsBody,
    context: CommandHandlerContext,
): void => {
    for (const entity of context.world.entities) {
        if (!entity.id || entity.id === body.id) continue;
        const other = context.impulseEngine.getBody(entity.id);
        if (!other) continue;

        const dx = body.x - other.x;
        const dy = body.y - other.y;
        const distance = Math.hypot(dx, dy);
        const minDistance = body.radius + other.radius;
        if (distance >= minDistance) continue;

        const normalX = distance > 0 ? dx / distance : 1;
        const normalY = distance > 0 ? dy / distance : 0;
        syncBodyPosition(
            body,
            other.x + normalX * minDistance,
            other.y + normalY * minDistance,
        );
        return;
    }
};
