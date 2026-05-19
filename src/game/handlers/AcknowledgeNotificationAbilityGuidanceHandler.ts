import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import {
    RuntimeCommandType,
    type AcknowledgeNotificationAbilityGuidanceCommand,
} from "../../engine/runtime/types";
import { findWorldEntity } from "./draftUtils";
import { acknowledgeNotificationAbilityGuidance } from "../notificationAbility/notificationAbilityGuidanceUtils";

export class AcknowledgeNotificationAbilityGuidanceHandler implements CommandHandler<AcknowledgeNotificationAbilityGuidanceCommand> {
    public readonly type =
        RuntimeCommandType.ACKNOWLEDGE_NOTIFICATION_ABILITY_GUIDANCE;

    public handle(
        _command: AcknowledgeNotificationAbilityGuidanceCommand,
        context: CommandHandlerContext,
    ): void {
        const world = findWorldEntity(context.world.entities);
        if (!world) return;
        acknowledgeNotificationAbilityGuidance(world);
    }
}
