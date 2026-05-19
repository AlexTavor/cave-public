import type { BehaviorAction } from "../../../../data/schemas/behavior";
import type { CommandBuffer, RuntimeCommand } from "../../types";
import { appendCommandMetadata } from "../../types";
import type { BehaviorContext } from "./ValueResolver";
import { ValueResolver } from "./ValueResolver";
import { executeDispatchAction } from "./actionExecutorDispatch.ts";
import { executeKillBodiesExceptAction } from "./actionExecutorKillBodiesExcept";
import {
    executeSpawnAction,
    executeSpawnBodyAction,
} from "./actionExecutorSpawn.ts";
import { executeMutateAction } from "./actionExecutorMutate.ts";
import { executeTransferAction } from "./actionExecutorTransfer.ts";
import { executePatchAction } from "./actionExecutorPatch.ts";
import {
    executeAddTraitAction,
    executeRemoveTraitAction,
} from "./actionExecutorTraits.ts";
import { executeShowCinematicAction } from "./actionExecutorShowCinematic";
import { executeShowNotificationAbilityGuidanceAction } from "./actionExecutorShowNotificationAbilityGuidance";
import { executeGainHabitiAction } from "./actionExecutorGainHabiti";
import { executeGainUnderstandingAction } from "./actionExecutorGainUnderstanding";
import { executeKillAction } from "./actionExecutorKill";
import { executeSpawnCarrierAction } from "./actionExecutorSpawnCarrier";

export class ActionExecutor {
    private readonly resolver: ValueResolver;

    constructor(resolver?: ValueResolver) {
        this.resolver = resolver ?? new ValueResolver();
    }

    public execute(
        action: BehaviorAction,
        context: BehaviorContext,
        commands: CommandBuffer<RuntimeCommand>,
    ): void {
        const scopedCommands = this.createScopedBuffer(context, commands);
        switch (action.type) {
            case "MUTATE":
                executeMutateAction(
                    action,
                    context,
                    scopedCommands,
                    this.resolver,
                );
                break;
            case "TRANSFER":
                executeTransferAction(
                    action,
                    context,
                    scopedCommands,
                    this.resolver,
                );
                break;
            case "DISPATCH":
                executeDispatchAction(action, context, scopedCommands);
                break;
            case "SPAWN":
                executeSpawnAction(action, context, scopedCommands);
                break;
            case "SPAWN_BODY":
                executeSpawnBodyAction(action, context, scopedCommands);
                break;
            case "KILL":
                executeKillAction(action, context, scopedCommands);
                break;
            case "KILL_ALL_BODIES_EXCEPT":
                executeKillBodiesExceptAction(action.quantity, scopedCommands);
                break;
            case "PATCH_BLUEPRINT":
                executePatchAction(action, scopedCommands);
                break;
            case "ADD_TRAIT":
                executeAddTraitAction(action, context, scopedCommands);
                break;
            case "REMOVE_TRAIT":
                executeRemoveTraitAction(action, context, scopedCommands);
                break;
            case "GAIN_UNDERSTANDING":
                executeGainUnderstandingAction(action, context, scopedCommands);
                break;
            case "GAIN_HABITI":
                executeGainHabitiAction(action, context, scopedCommands);
                break;
            case "SPAWN_CARRIER":
                executeSpawnCarrierAction(action, context, scopedCommands);
                break;
            case "SHOW_CINEMATIC":
                executeShowCinematicAction(action, scopedCommands);
                break;
            case "SHOW_NOTIFICATION_ABILITY_GUIDANCE":
                executeShowNotificationAbilityGuidanceAction(
                    action,
                    scopedCommands,
                );
                break;
        }
    }

    private createScopedBuffer(
        context: BehaviorContext,
        commands: CommandBuffer<RuntimeCommand>,
    ): CommandBuffer<RuntimeCommand> {
        if (!context.sourceLane || !context.self.id) {
            return commands;
        }
        return {
            ...commands,
            enqueue: (command) =>
                commands.enqueue(
                    appendCommandMetadata(command, {
                        sourceEntityId: context.self.id,
                        sourceLane: context.sourceLane,
                    }),
                ),
        };
    }
}

