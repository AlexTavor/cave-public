import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import {
    RuntimeCommandType,
    type AcknowledgeHabitiAnnouncementCommand,
} from "../../engine/runtime/types";
import type { HabitiAnnouncementComponent } from "../../data/schemas/components/habitiAnnouncement";
import { findWorldEntity } from "./draftUtils";
import { acknowledgeHabitiAnnouncement } from "../habiti/habitiAnnouncementUtils";

export class AcknowledgeHabitiAnnouncementHandler implements CommandHandler<AcknowledgeHabitiAnnouncementCommand> {
    public readonly type = RuntimeCommandType.ACKNOWLEDGE_HABITI_ANNOUNCEMENT;

    public handle(
        _command: AcknowledgeHabitiAnnouncementCommand,
        context: CommandHandlerContext,
    ): void {
        const world = findWorldEntity(context.world.entities) as {
            habitiAnnouncement?: HabitiAnnouncementComponent;
        } | null;
        if (!world) return;
        acknowledgeHabitiAnnouncement(world);
    }
}
