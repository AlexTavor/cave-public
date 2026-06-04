import type { RuntimeEntity, SpawnCommand } from "../types";
import { RuntimeCommandType } from "../types";
import type { CommandHandler, CommandHandlerContext } from "./types";
import { deepMerge } from "../../../utils/objectUtils";
import { resolveBlueprint, syncPhysicsRadiusFromDisplay } from "./spawnUtils";
import { cloneStatefulComponents } from "./spawnCloneUtils";
import { enqueuePendingBodyHabitiUpdate } from "./spawnPendingHabiti";
import { enqueueMirroredFactAdjust } from "../factCommands";
import { resolvePendingHabiti } from "./spawnBodyHabiti";
import { applySpawnPhysics } from "./spawnPhysics";
import { applySpawnParent } from "./spawnParentResolver";
import { spawnUnifiedBlueprints } from "./spawnUnifiedBlueprints";
import { mintSpawnId } from "./mintSpawnId";

const WORLD_ID = "sys_world";

export class SpawnHandler implements CommandHandler<SpawnCommand> {
    public readonly type = RuntimeCommandType.SPAWN;

    public handle(command: SpawnCommand, context: CommandHandlerContext): void {
        const { blueprintId, id, x, y, parentId, forcedHabiti, assignTo } =
            command.payload;
        const blueprint = resolveBlueprint(blueprintId, context);

        if (!blueprint) {
            context.telemetry.log(
                "tick",
                `Spawn failed: blueprint '${blueprintId}' not found.`,
            );
            return;
        }

        const entityId = id ?? mintSpawnId(context.world);
        const uniqueComponents = cloneStatefulComponents(
            blueprint.components || {},
        );

        const entity: RuntimeEntity = {
            id: entityId,
            blueprintId,
            label: blueprint.label,
            tags: [...(blueprint.tags || [])],
            ...uniqueComponents,
        };
        spawnUnifiedBlueprints(command, blueprintId, entity, context);
        applySpawnParent(
            entity as RuntimeEntity & { parent?: any },
            blueprintId,
            context,
            parentId,
        );

        syncPhysicsRadiusFromDisplay(entity, blueprint.components?.display);

        const isBodyBlueprint =
            Array.isArray(entity.tags) && entity.tags.includes("body");
        const physicsData = (entity as any).physics || {};
        if (
            x !== undefined &&
            y !== undefined &&
            (!isBodyBlueprint || (entity as any).physics)
        ) {
            physicsData.x = x;
            physicsData.y = y;
            (entity as any).physics = physicsData;
        }

        applySpawnPhysics(
            entity,
            entityId,
            Boolean(blueprint.components?.physics),
            context,
        );

        const pendingHabiti = resolvePendingHabiti(
            entity,
            entityId,
            context,
            forcedHabiti,
        );

        const existing = context.world.entities.find(
            (current) => current.id === entityId,
        );
        if (existing && entityId === WORLD_ID) {
            deepMerge(existing, entity);
            context.telemetry.log(
                "tick",
                "SPAWN: updated existing 'sys_world' in place.",
            );
            return;
        }

        if (existing) {
            context.world.remove(existing);
            context.impulseEngine.removeBody(entityId);
        }

        context.world.add(entity);
        // Deferred assignment for behavior-phase body spawns (see actionExecutorSpawn).
        // Enqueued before the habiti update so the ASSIGN still drains ahead of the
        // body's identity finalization, exactly as it did when the behavior action
        // enqueued SPAWN + ASSIGN itself.
        if (assignTo && context.commands) {
            context.commands.enqueue({
                type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
                payload: {
                    updates: [{ bodyId: entityId, ownerId: assignTo }],
                },
            });
        }
        enqueuePendingBodyHabitiUpdate(context, entityId, pendingHabiti);
        if (blueprintId !== WORLD_ID && context.commands) {
            enqueueMirroredFactAdjust(
                context.commands,
                "blueprint_spawned",
                blueprintId,
                1,
            );
        }
        context.telemetry.log(
            "tick",
            `Spawned '${blueprintId}' as '${entityId}'.`,
        );
    }
}

