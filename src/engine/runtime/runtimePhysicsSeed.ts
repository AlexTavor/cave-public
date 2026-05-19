import type { World } from "miniplex";
import type { RuntimeEntity } from "./types";
import type { ImpulseEngine } from "../physics/impulse/ImpulseEngine";
import { PhysicsComponentSchema } from "../../data/schemas/physics";
import { buildPhysicsBody } from "./handlers/spawnUtils";

/**
 * Registers physics bodies for any pre-seeded ECS entities that carry a valid
 * physics component. Called once after ensureSystemEntities so that entities
 * like sys_world and sys_pointer are tracked by the impulse engine from the
 * start, enabling correct rendering position and vein graph construction.
 */
export const seedPhysicsIntoEngine = (
    world: World<RuntimeEntity>,
    engine: ImpulseEngine,
): void => {
    for (const entity of world.entities) {
        if (!entity.id) continue;
        const result = PhysicsComponentSchema.safeParse(
            (entity as { physics?: unknown }).physics,
        );
        if (!result.success) continue;
        engine.addBody(buildPhysicsBody(entity.id, result.data));
    }
};

