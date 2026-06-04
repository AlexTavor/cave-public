import { RuntimeCommandType } from "../../engine/runtime/types";
import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import type { GainHabitiCommand } from "../../engine/runtime/types/runtimeCommandUpdates";
import { findEntityById } from "../../engine/runtime/handlers/updateCaveHandler.helpers";
import { enqueueMirroredFactAdjust } from "../../engine/runtime/factCommands";
import { enqueueHabitiAnnouncement } from "../habiti/habitiAnnouncementUtils";
import { UpdateCaveWithResourceGainBonusHandler } from "./UpdateCaveWithResourceGainBonusHandler";
import { readOwnedHabiti } from "../habiti/knownHabiti";

export class GainHabitiHandler implements CommandHandler<GainHabitiCommand> {
    public readonly type = RuntimeCommandType.GAIN_HABITI;
    private readonly caveHandler = new UpdateCaveWithResourceGainBonusHandler();

    public handle(command: GainHabitiCommand, context: CommandHandlerContext) {
        const { entityId, habitusId } = command.payload;
        const entity = findEntityById(context.world.entities, entityId);
        const cave = (entity as { cave?: Record<string, unknown> })?.cave;
        if (!entity)
            return this.log(context, `entity '${entityId}' not found.`);
        if (!cave || typeof cave !== "object") {
            return this.log(
                context,
                `entity '${entityId}' has no cave component.`,
            );
        }
        if (!context.cartridge.config?.habiti?.[habitusId]) {
            return this.log(context, `unknown habitus '${habitusId}'.`);
        }
        if (readOwnedHabiti(entity).includes(habitusId)) return;
        this.caveHandler.handle(
            {
                type: RuntimeCommandType.UPDATE_CAVE,
                payload: {
                    entityId,
                    ownedHabiti: [...readOwnedHabiti(entity), habitusId],
                },
            },
            context,
        );
        if (entity.id !== "sys_world") return;
        context.commands &&
            enqueueMirroredFactAdjust(
                context.commands,
                "habitus_owned",
                habitusId,
                1,
            );
        enqueueHabitiAnnouncement(entity, {
            habitusIds: [habitusId],
            xpTotal: 0,
            resourceTotals: [],
        });
    }

    private log(context: CommandHandlerContext, detail: string) {
        context.telemetry.log("errors", `GAIN_HABITI failed: ${detail}`);
    }
}
