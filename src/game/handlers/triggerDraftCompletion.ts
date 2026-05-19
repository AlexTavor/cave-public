import type { BehaviorAction } from "../../data/schemas/behavior";
import type { CommandHandlerContext } from "../../engine/runtime/handlers/types";
import { Snapshot } from "../../engine/runtime/Snapshot";
import type { RuntimeEntity } from "../../engine/runtime/types";
import { executeBehaviorActionList } from "./executeBehaviorActionList";

export const executeDraftCompletion = (
    actions: BehaviorAction[],
    self: RuntimeEntity,
    context: CommandHandlerContext,
): void => {
    if (!context.commands) return;
    executeBehaviorActionList({
        actions,
        self,
        snapshot: new Snapshot(
            [...context.world.entities],
            context.impulseEngine,
            context.cartridge.blueprints,
        ),
        commands: context.commands,
        sourceLane: "draft_on_complete",
    });
};
