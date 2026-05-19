import type { CommandHandlerContext } from "../../engine/runtime/handlers/types";
import type { TriggerDraftCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { executeDraftCompletion } from "./triggerDraftCompletion";

export const handleEmptyDraftSelection = (
    command: TriggerDraftCommand,
    context: CommandHandlerContext,
): boolean => {
    const onComplete = command.payload.onComplete ?? [];
    if (onComplete.length === 0) return false;
    const triggerEntity = context.world.entities.find(
        (entity) => entity.id === command.payload.triggerEntityId,
    );
    if (!triggerEntity) {
        context.telemetry.log(
            "errors",
            "TRIGGER_DRAFT failed: trigger entity missing.",
        );
        return true;
    }
    executeDraftCompletion(onComplete, triggerEntity, context);
    return true;
};

export const enqueueDraftOpenedFact = (
    poolId: string,
    context: CommandHandlerContext,
): void => {
    context.commands?.enqueue({
        type: RuntimeCommandType.ADJUST_FACT,
        payload: {
            scope: "run",
            factType: "draft_opened",
            factAbout: poolId,
            delta: 1,
        },
    });
};
