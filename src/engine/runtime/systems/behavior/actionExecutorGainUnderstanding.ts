import type { GainUnderstandingAction } from "../../../../data/schemas/behavior";
import type { CommandBuffer, RuntimeCommand } from "../../types";
import { RuntimeCommandType } from "../../types";
import type { BehaviorContext } from "./ValueResolver";
import { resolveEntityId } from "./actionExecutorUtils";

export const executeGainUnderstandingAction = (
    action: GainUnderstandingAction,
    context: BehaviorContext,
    commands: CommandBuffer<RuntimeCommand>,
) => {
    commands.enqueue({
        type: RuntimeCommandType.GAIN_UNDERSTANDING,
        payload: {
            entityId: resolveEntityId(action.entityId ?? "sys_world", context),
            understandingId: action.understandingId,
        },
    });
};
