import type { SpawnCarrierAction } from "../../../../data/schemas/behavior";
import type { CommandBuffer, RuntimeCommand } from "../../types";
import { RuntimeCommandType } from "../../types";
import type { BehaviorContext } from "./ValueResolver";

const resolveSourcePosition = (context: BehaviorContext) => {
    if (!context.self.id) return {};
    const body = context.snapshot.getPhysicsBody(context.self.id);
    return body ? { x: body.position.x, y: body.position.y } : {};
};

export const executeSpawnCarrierAction = (
    action: SpawnCarrierAction,
    context: BehaviorContext,
    commands: CommandBuffer<RuntimeCommand>,
) => {
    commands.enqueue({
        type: RuntimeCommandType.SPAWN_CARRIER,
        payload: {
            tags: [...action.tags],
            commands: action.commands,
            ...resolveSourcePosition(context),
        },
    });
};
