import type { TransferAction } from "../../../../data/schemas/behavior";
import type { CommandBuffer, RuntimeCommand } from "../../types";
import { RuntimeCommandType } from "../../types";
import type { BehaviorContext, ValueResolver } from "./ValueResolver";
import { resolveSmartSource, resolveSmartTarget } from "./targetSelector";

export const executeTransferAction = (
    action: TransferAction,
    context: BehaviorContext,
    commands: CommandBuffer<RuntimeCommand>,
    resolver: ValueResolver,
): void => {
    const sourceId = resolveSmartSource(action.source, action.resource, {
        self: context.self,
        snapshot: context.snapshot,
    });
    const targetId = resolveSmartTarget(action.target, action.resource, {
        self: context.self,
        snapshot: context.snapshot,
    });
    if (!sourceId || !targetId) return;
    if (sourceId === targetId) return;

    const amount = resolver.resolve(action.amount, context);

    commands.enqueue({
        type: RuntimeCommandType.TRANSFER_ASSETS,
        payload: {
            sourceId,
            targetId,
            payload: { [action.resource]: amount },
            ...(action.isImmediate === true ? { isImmediate: true } : {}),
        },
    });
};
