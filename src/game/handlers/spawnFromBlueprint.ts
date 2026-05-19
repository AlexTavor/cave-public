import { nanoid } from "nanoid";
import type { RuntimeEntity } from "../../engine/runtime/types";
import type { CommandHandlerContext } from "../../engine/runtime/handlers/types";
import {
    resolveBlueprint,
    buildPhysicsBody,
    syncPhysicsRadiusFromDisplay,
} from "../../engine/runtime/handlers/spawnUtils";
import { cloneStatefulComponents } from "../../engine/runtime/handlers/spawnCloneUtils";
import { ensureSpawnedBodyIdentity } from "../../engine/runtime/handlers/spawnBodyIdentity";
import { enqueuePendingBodyHabitiUpdate } from "../../engine/runtime/handlers/spawnPendingHabiti";
import { PhysicsComponentSchema } from "../../data/schemas/physics";

export const spawnFromBlueprint = (
    blueprintId: string,
    context: CommandHandlerContext,
    id?: string,
): void => {
    const blueprint = resolveBlueprint(blueprintId, context);
    if (!blueprint) {
        context.telemetry.log(
            "errors",
            `Spawn failed: blueprint '${blueprintId}' not found.`,
        );
        return;
    }
    const entityId = id ?? nanoid();
    const components = cloneStatefulComponents(blueprint.components || {});
    const entity: RuntimeEntity = {
        id: entityId,
        blueprintId,
        label: blueprint.label,
        tags: [...(blueprint.tags || [])],
        ...components,
    };
    syncPhysicsRadiusFromDisplay(entity, blueprint.components?.display);
    const physicsData = (entity as { physics?: unknown }).physics;
    if (physicsData) {
        const result = PhysicsComponentSchema.safeParse(physicsData);
        if (result.success) {
            context.impulseEngine.addBody(
                buildPhysicsBody(entityId, result.data),
            );
        }
    }
    const body = (entity as { body?: Record<string, unknown> }).body;
    let pendingHabiti: string[] | null = null;
    if (body) {
        pendingHabiti = ensureSpawnedBodyIdentity(body, entityId, context);
    }
    context.world.add(entity);
    enqueuePendingBodyHabitiUpdate(context, entityId, pendingHabiti);
};

