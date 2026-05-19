import type { RuntimeEntity } from "../types";
import { PhysicsComponentSchema } from "../../../data/schemas/physics";
import type { CommandHandlerContext } from "./types";
import { buildPhysicsBody } from "./spawnUtils";
import { resolveSpawnOverlap } from "./spawnCollisionPlacement";

export const applySpawnPhysics = (
    entity: RuntimeEntity,
    entityId: string,
    hasPhysics: boolean,
    context: CommandHandlerContext,
): void => {
    if (!hasPhysics) return;
    const physicsCandidate = (entity as { physics?: unknown }).physics;
    const physicsResult = PhysicsComponentSchema.safeParse(physicsCandidate);
    if (physicsResult.success) {
        const body = buildPhysicsBody(entityId, physicsResult.data);
        resolveSpawnOverlap(body, context);
        (entity as { physics?: { x?: number; y?: number } }).physics = {
            ...(entity as { physics?: { x?: number; y?: number } }).physics,
            x: body.x,
            y: body.y,
        };
        context.impulseEngine.addBody(body);
        return;
    }
    if (physicsCandidate !== undefined) {
        context.telemetry.log(
            "errors",
            `Spawn failed: invalid physics component on '${entityId}'.`,
        );
    }
};
