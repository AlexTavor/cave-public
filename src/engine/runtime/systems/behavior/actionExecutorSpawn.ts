import { nanoid } from "nanoid";
import type {
    SpawnAction,
    SpawnBodyAction,
} from "../../../../data/schemas/behavior";
import type { CommandBuffer, RuntimeCommand } from "../../types";
import { RuntimeCommandType } from "../../types";
import type { BehaviorContext } from "./ValueResolver";

type SpawnExtras = { parentId?: string; forcedHabiti?: string[] };

const resolveSpawnExtras = (
    parentId: string | undefined,
    forcedHabiti: string[] | undefined,
    context: BehaviorContext,
): SpawnExtras => {
    const extras: SpawnExtras = {};
    if (parentId === "self") extras.parentId = context.self.id;
    else if (parentId) extras.parentId = parentId;
    if (forcedHabiti?.length) extras.forcedHabiti = forcedHabiti;
    return extras;
};

const resolveSpawnPosition = (
    context: BehaviorContext,
): { x?: number; y?: number } => {
    if (!context.self.id) return {};
    const body = context.snapshot.getPhysicsBody(context.self.id);
    if (!body) return {};
    const angle = Math.random() * Math.PI * 2;
    const dist = body.radius || 20;
    return {
        x: body.position.x + Math.cos(angle) * dist,
        y: body.position.y + Math.sin(angle) * dist,
    };
};

export const executeSpawnAction = (
    action: SpawnAction,
    context: BehaviorContext,
    commands: CommandBuffer<RuntimeCommand>,
): void => {
    const payload: {
        blueprintId: string;
        id?: string;
        parentId?: string;
        forcedHabiti?: string[];
    } = {
        blueprintId: action.blueprintId,
        ...resolveSpawnExtras(action.parentId, action.forcedHabiti, context),
    };
    if (action.id) payload.id = action.id;

    commands.enqueue({
        type: RuntimeCommandType.SPAWN,
        payload,
    });
};

export const executeSpawnBodyAction = (
    action: SpawnBodyAction,
    context: BehaviorContext,
    commands: CommandBuffer<RuntimeCommand>,
): void => {
    const entityId = nanoid();
    const { x, y } = resolveSpawnPosition(context);

    commands.enqueue({
        type: RuntimeCommandType.SPAWN,
        payload: {
            blueprintId: action.blueprintId,
            id: entityId,
            x,
            y,
            ...resolveSpawnExtras(
                action.parentId,
                action.forcedHabiti,
                context,
            ),
        },
    });

    commands.enqueue({
        type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
        payload: {
            updates: [
                {
                    bodyId: entityId,
                    ownerId: action.target ?? "sys_world",
                },
            ],
        },
    });
};

