import type { MutateAction } from "../../../../data/schemas/behavior";
import type { CommandBuffer, RuntimeCommand } from "../../types";
import { RuntimeCommandType } from "../../types";
import type { BehaviorContext, ValueResolver } from "./ValueResolver";
import {
    applyMutation,
    parseEntityStateTarget,
    parseMaxTarget,
    resolveTargetKey,
} from "./actionExecutorUtils";

export const shouldSkipDeltaMutation = (
    op: MutateAction["op"],
    value: number,
): boolean => (op === "ADD" || op === "SUB") && value === 0;

type StateMutationEnqueuer = (
    commands: CommandBuffer<RuntimeCommand>,
    entityId: string,
    key: string,
    value: number,
) => void;

const enqueueAdd: StateMutationEnqueuer = (commands, entityId, key, value) =>
    commands.enqueue({
        type: RuntimeCommandType.ADJUST_STATE,
        payload: { entityId, key, delta: value },
    });

const enqueueSub: StateMutationEnqueuer = (commands, entityId, key, value) =>
    commands.enqueue({
        type: RuntimeCommandType.ADJUST_STATE,
        payload: { entityId, key, delta: -value },
    });

const enqueueSet: StateMutationEnqueuer = (commands, entityId, key, value) =>
    commands.enqueue({
        type: RuntimeCommandType.UPDATE_STATE,
        payload: { entityId, key, value },
    });

const stateMutationEnqueuers: Record<MutateAction["op"], StateMutationEnqueuer> =
    {
        ADD: enqueueAdd,
        SUB: enqueueSub,
        SET: enqueueSet,
    };

export const enqueueStateMutation = (
    commands: CommandBuffer<RuntimeCommand>,
    entityId: string,
    key: string,
    op: MutateAction["op"],
    value: number,
): void => {
    if (shouldSkipDeltaMutation(op, value)) return;
    stateMutationEnqueuers[op](commands, entityId, key, value);
};

export const handleEntityStateTarget = (
    action: MutateAction,
    context: BehaviorContext,
    commands: CommandBuffer<RuntimeCommand>,
    resolver: ValueResolver,
    resolvedValue: number,
): boolean => {
    const target = parseEntityStateTarget(action.target);
    if (!target) return false;
    const current = resolver.resolve(
        `${target.entityId}.state.${target.key}.value`,
        context,
    );
    const next = applyMutation(action.op, current, resolvedValue);
    if (current === next) return true;
    if (target.entityId === "sys_world") {
        commands.enqueue({
            type: RuntimeCommandType.SET_GLOBAL,
            payload: { key: target.key, value: next },
        });
        return true;
    }
    enqueueStateMutation(
        commands,
        target.entityId,
        target.key,
        action.op,
        resolvedValue,
    );
    return true;
};

const applyGlobalMutation = (
    action: MutateAction,
    context: BehaviorContext,
    commands: CommandBuffer<RuntimeCommand>,
    resolver: ValueResolver,
    resolvedValue: number,
    targetKey: string,
): void => {
    const current = resolver.resolve(action.target, context);
    const next = applyMutation(action.op, current, resolvedValue);
    if (current !== next) {
        commands.enqueue({
            type: RuntimeCommandType.SET_GLOBAL,
            payload: { key: targetKey, value: next },
        });
    }
};

const applyMaxMutation = (
    action: MutateAction,
    context: BehaviorContext,
    commands: CommandBuffer<RuntimeCommand>,
    resolver: ValueResolver,
    resolvedValue: number,
    selfId: string,
    maxKey: string,
): void => {
    const currentMax = resolver.resolve(`self.state.${maxKey}.max`, context);
    const nextMax = applyMutation(action.op, currentMax, resolvedValue);
    if (currentMax !== nextMax) {
        commands.enqueue({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: { entityId: selfId, key: maxKey, max: nextMax },
        });
    }
};

const applySelfStateMutation = (
    action: MutateAction,
    context: BehaviorContext,
    commands: CommandBuffer<RuntimeCommand>,
    resolver: ValueResolver,
    resolvedValue: number,
    selfId: string,
    targetKey: string,
): void => {
    if (shouldSkipDeltaMutation(action.op, resolvedValue)) return;
    if (
        action.op === "SET" &&
        resolver.resolve(action.target, context) === resolvedValue
    )
        return;
    enqueueStateMutation(commands, selfId, targetKey, action.op, resolvedValue);
};

export const handleSelfOrGlobalMutation = (
    action: MutateAction,
    context: BehaviorContext,
    commands: CommandBuffer<RuntimeCommand>,
    resolver: ValueResolver,
    resolvedValue: number,
): void => {
    const targetKey = resolveTargetKey(action.target);
    if (!targetKey) return;
    if (
        action.target.startsWith("global.") ||
        action.target.startsWith("globals.")
    ) {
        applyGlobalMutation(
            action,
            context,
            commands,
            resolver,
            resolvedValue,
            targetKey,
        );
        return;
    }
    if (!context.self.id) return;
    const maxKey = parseMaxTarget(action.target);
    if (maxKey) {
        applyMaxMutation(
            action,
            context,
            commands,
            resolver,
            resolvedValue,
            context.self.id,
            maxKey,
        );
        return;
    }
    applySelfStateMutation(
        action,
        context,
        commands,
        resolver,
        resolvedValue,
        context.self.id,
        targetKey,
    );
};
