import type { ShowNotificationAbilityGuidanceAction } from "../../../../data/schemas/behaviorNotificationAbilityGuidance";
import type { CommandBuffer, RuntimeCommand } from "../../types";
import { RuntimeCommandType } from "../../types";

export const executeShowNotificationAbilityGuidanceAction = (
    action: ShowNotificationAbilityGuidanceAction,
    commands: CommandBuffer<RuntimeCommand>,
): void => {
    commands.enqueue({
        type: RuntimeCommandType.SHOW_NOTIFICATION_ABILITY_GUIDANCE,
        payload: {
            abilityId: action.abilityId,
            title: action.title,
            text: action.text,
            imageUrl: action.imageUrl,
        },
    });
};
