import type { MutateAction } from "../../../../data/schemas/behavior";
import type { CommandBuffer, RuntimeCommand } from "../../types";
import { RuntimeCommandType } from "../../types";
import type { BehaviorContext, ValueResolver } from "./ValueResolver";
import { applyMutation, parseCaveTarget } from "./actionExecutorUtils";
import { executePowerSinkMutation } from "./actionExecutorPowerSink";
import {
    handleEntityStateTarget,
    handleSelfOrGlobalMutation,
} from "./actionExecutorMutateHelpers";

export const executeMutateAction = (
    action: MutateAction,
    context: BehaviorContext,
    commands: CommandBuffer<RuntimeCommand>,
    resolver: ValueResolver,
): void => {
    if (action.target.startsWith("self.powerSink.")) {
        executePowerSinkMutation(action, context, commands, resolver);
        return;
    }
    const caveTarget = parseCaveTarget(action.target, context);
    if (caveTarget) {
        const currentValue = resolver.resolve(action.target, context);
        const resolvedValue = resolver.resolve(action.value, context);
        const nextValue = applyMutation(action.op, currentValue, resolvedValue);
        if (currentValue === nextValue) return;
        commands.enqueue({
            type: RuntimeCommandType.UPDATE_CAVE,
            payload: {
                entityId: caveTarget.entityId,
                attributes: { [caveTarget.attribute]: nextValue },
            },
        });
        return;
    }

    const resolvedValue = resolver.resolve(action.value, context);
    if (
        handleEntityStateTarget(
            action,
            context,
            commands,
            resolver,
            resolvedValue,
        )
    ) {
        return;
    }
    handleSelfOrGlobalMutation(
        action,
        context,
        commands,
        resolver,
        resolvedValue,
    );
};

