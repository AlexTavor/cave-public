import type { DispatchAction } from "../../../../data/schemas/behavior";
import type { CommandBuffer, RuntimeCommand } from "../../types";
import { RuntimeCommandType } from "../../types";
import type { BehaviorContext } from "./ValueResolver";
import { resolveEntityId } from "./actionExecutorUtils";

export const executeDispatchAction = (
    action: DispatchAction,
    context: BehaviorContext,
    commands: CommandBuffer<RuntimeCommand>,
): void => {
    const entityId = resolveEntityId(action.entity, context);
    const targetId = resolveEntityId(action.target, context);
    if (!entityId || !targetId) return;

    commands.enqueue({
        type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
        payload: { updates: [{ bodyId: entityId, ownerId: targetId }] },
    });
};

