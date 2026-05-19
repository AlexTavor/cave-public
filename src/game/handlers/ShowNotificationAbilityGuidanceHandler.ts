import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import {
    RuntimeCommandType,
    type ShowNotificationAbilityGuidanceCommand,
} from "../../engine/runtime/types";
import { findWorldEntity } from "./draftUtils";
import { enqueueNotificationAbilityGuidance } from "../notificationAbility/notificationAbilityGuidanceUtils";

export class ShowNotificationAbilityGuidanceHandler implements CommandHandler<ShowNotificationAbilityGuidanceCommand> {
    public readonly type =
        RuntimeCommandType.SHOW_NOTIFICATION_ABILITY_GUIDANCE;

    public handle(
        command: ShowNotificationAbilityGuidanceCommand,
        context: CommandHandlerContext,
    ): void {
        const world = findWorldEntity(context.world.entities);
        if (!world) return;
        enqueueNotificationAbilityGuidance(world, command.payload);
    }
}
