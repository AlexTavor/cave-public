import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import type { TutorialComponent } from "../../engine/runtime/components/TutorialComponent";
import { getActiveDraftGuidanceTargetOptionId } from "../../engine/runtime/components/tutorialSelectors";
import type { RuntimeCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import {
    clearDraftComponent,
    findWorldEntity,
    getDraftComponent,
} from "./draftUtils";

export class ResolveDraftHandler implements CommandHandler<RuntimeCommand> {
    public readonly type = RuntimeCommandType.RESOLVE_DRAFT;

    public handle(
        command: RuntimeCommand,
        context: CommandHandlerContext,
    ): void {
        if (command.type !== RuntimeCommandType.RESOLVE_DRAFT) return;
        const worldEntity = findWorldEntity(context.world.entities);
        if (!worldEntity) {
            context.telemetry.log(
                "errors",
                "RESOLVE_DRAFT failed: sys_world missing.",
            );
            return;
        }

        const draft = getDraftComponent(worldEntity);
        if (!draft?.active) {
            context.telemetry.log(
                "errors",
                "RESOLVE_DRAFT failed: no active draft.",
            );
            return;
        }

        const guidedOptionId = getActiveDraftGuidanceTargetOptionId(
            (worldEntity as { tutorial?: TutorialComponent }).tutorial,
        );
        if (
            guidedOptionId &&
            draft.options.some((entry) => entry.id === guidedOptionId)
        ) {
            if (command.payload.selectedOptionId !== guidedOptionId) {
                context.telemetry.log(
                    "errors",
                    `RESOLVE_DRAFT rejected: tutorial requires option '${guidedOptionId}'.`,
                );
                return;
            }
        } else if (guidedOptionId) {
            context.telemetry.log(
                "errors",
                `RESOLVE_DRAFT tutorial target '${guidedOptionId}' missing from active draft.`,
            );
        }

        const option = draft.options.find(
            (entry) => entry.id === command.payload.selectedOptionId,
        );
        if (!option) {
            context.telemetry.log(
                "errors",
                "RESOLVE_DRAFT failed: option not in active draft.",
            );
            clearDraftComponent(worldEntity);
            return;
        }

        const triggerEntity = context.world.entities.find(
            (entity) => entity.id === draft.triggerEntityId,
        );
        if (!triggerEntity) {
            context.telemetry.log(
                "errors",
                "RESOLVE_DRAFT failed: trigger entity missing.",
            );
            clearDraftComponent(worldEntity);
            return;
        }

        if (option.oneOff) {
            draft.pickedOneOffs = [...(draft.pickedOneOffs ?? []), option.id];
        }

        draft.selectedOptionId = option.id;
    }
}

