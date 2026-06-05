import type {
    SpawnAction,
    SpawnBodyAction,
} from "../../../../data/schemas/behavior";
import type { CommandBuffer, RuntimeCommand } from "../../types";
import { RuntimeCommandType } from "../../types";
import type { BehaviorContext } from "./ValueResolver";
import { pseudoRandom } from "../../../../utils/pseudoRandom";
import { readWorldSeed, withWorldSeed } from "../../../../utils/worldSeed";

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
    // Deterministic spawn angle (no Math.random — the headless balancing runner replays runs).
    // Seeded from worldSeed + the spawner id + its current position; position supplies per-spawn
    // variety because the read-only behavior snapshot carries no spawn counter (the entity id is
    // minted deterministically later, in the command phase — see executeSpawnBodyAction).
    const worldSeed = readWorldSeed(
        context.snapshot.getEntity("sys_world") as
            | { state?: Record<string, unknown> }
            | undefined,
        "world",
    );
    const angle =
        pseudoRandom(
            withWorldSeed(
                worldSeed,
                `spawn:${context.self.id}:${body.position.x}:${body.position.y}`,
            ),
        ) *
        Math.PI *
        2;
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
    const { x, y } = resolveSpawnPosition(context);

    // The entity id is minted deterministically in the command phase (SpawnHandler),
    // not here: the behavior snapshot is read-only, so it can't host the monotonic
    // spawn counter. `assignTo` carries the owner so SpawnHandler can issue the
    // body→owner assignment once the id exists.
    commands.enqueue({
        type: RuntimeCommandType.SPAWN,
        payload: {
            blueprintId: action.blueprintId,
            x,
            y,
            assignTo: action.target ?? "sys_world",
            ...resolveSpawnExtras(
                action.parentId,
                action.forcedHabiti,
                context,
            ),
        },
    });
};

