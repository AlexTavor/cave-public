import { RuntimeCommandType } from "../../types";
import type { KillAction } from "../../../../data/schemas/behavior";
import type { CommandBuffer, RuntimeCommand } from "../../types";
import type { BehaviorContext } from "./ValueResolver";
import { resolveEntityId } from "./actionExecutorUtils";

export const executeKillAction = (
    action: KillAction,
    context: BehaviorContext,
    commands: CommandBuffer<RuntimeCommand>,
) => {
    commands.enqueue({
        type: RuntimeCommandType.KILL,
        payload: { entityId: resolveEntityId(action.entityId, context) },
    });
};
