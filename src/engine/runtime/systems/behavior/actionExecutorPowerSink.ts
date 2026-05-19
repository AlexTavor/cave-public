import type { MutateAction } from "../../../../data/schemas/behavior";
import type { CommandBuffer, RuntimeCommand } from "../../types";
import { RuntimeCommandType } from "../../types";
import type { BehaviorContext, ValueResolver } from "./ValueResolver";
import { applyMutation } from "./actionExecutorUtils";

export const executePowerSinkMutation = (
    action: MutateAction,
    context: BehaviorContext,
    commands: CommandBuffer<RuntimeCommand>,
    resolver: ValueResolver,
): void => {
    if (!context.self.id) return;
    const resolvedValue = resolver.resolve(action.value, context);
    const currentValue = resolver.resolve(action.target, context);
    const nextValue = applyMutation(action.op, currentValue, resolvedValue);

    const target = action.target.replace("self.powerSink.", "");

    if (target === "throttle") {
        commands.enqueue({
            type: RuntimeCommandType.UPDATE_POWER_SINK,
            payload: { entityId: context.self.id, throttle: nextValue },
        });
        return;
    }

    const [field, attr] = target.split(".");
    if (field === "baseDemand" && attr) {
        commands.enqueue({
            type: RuntimeCommandType.UPDATE_POWER_SINK,
            payload: {
                entityId: context.self.id,
                baseDemand: { [attr]: nextValue },
            },
        });
    } else if (field === "maxDemand" && attr) {
        commands.enqueue({
            type: RuntimeCommandType.UPDATE_POWER_SINK,
            payload: {
                entityId: context.self.id,
                maxDemand: { [attr]: nextValue },
            },
        });
    }
};
