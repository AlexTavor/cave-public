import type { GainHabitiAction } from "../../../../data/schemas/behavior";
import type { CommandBuffer, RuntimeCommand } from "../../types";
import { RuntimeCommandType } from "../../types";
import type { BehaviorContext } from "./ValueResolver";
import { resolveEntityId } from "./actionExecutorUtils";

export const executeGainHabitiAction = (
    action: GainHabitiAction,
    context: BehaviorContext,
    commands: CommandBuffer<RuntimeCommand>,
) => {
    commands.enqueue({
        type: RuntimeCommandType.GAIN_HABITI,
        payload: {
            entityId: resolveEntityId(action.entityId ?? "sys_world", context),
            habitusId: action.habitusId,
        },
    });
};
