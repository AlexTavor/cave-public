import { RuntimeCommandType } from "../../engine/runtime/types";
import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import type { GainUnderstandingCommand } from "../../engine/runtime/types/runtimeCommandUpdates";
import {
    applyOwnedUnderstanding,
    findEntityById,
} from "../../engine/runtime/handlers/updateCaveHandler.helpers";
import { enqueueMirroredFactAdjust } from "../facts/factCommands";
import { enqueueResourceGainBonusStateSync } from "../habiti/enqueueResourceGainBonusStateSync";

export class GainUnderstandingHandler implements CommandHandler<GainUnderstandingCommand> {
    public readonly type = RuntimeCommandType.GAIN_UNDERSTANDING;

    public handle(
        command: GainUnderstandingCommand,
        context: CommandHandlerContext,
    ): void {
        const { entityId, understandingId } = command.payload;
        const entity = findEntityById(context.world.entities, entityId);
        if (!entity) {
            context.telemetry.log(
                "errors",
                `GAIN_UNDERSTANDING failed: entity '${entityId}' not found.`,
            );
            return;
        }
        const cave = (entity as { cave?: Record<string, unknown> }).cave;
        if (!cave || typeof cave !== "object") {
            context.telemetry.log(
                "errors",
                `GAIN_UNDERSTANDING failed: entity '${entityId}' has no cave component.`,
            );
            return;
        }
        if (!context.cartridge.config?.understanding?.[understandingId]) {
            context.telemetry.log(
                "errors",
                `GAIN_UNDERSTANDING failed: unknown understanding '${understandingId}'.`,
            );
            return;
        }
        const current = Array.isArray(cave.ownedUnderstanding)
            ? (cave.ownedUnderstanding as string[])
            : [];
        if (current.includes(understandingId)) return;
        applyOwnedUnderstanding(cave, [...current, understandingId]);
        if (entity.id !== "sys_world") return;
        if (context.commands) {
            enqueueMirroredFactAdjust(
                context.commands,
                "understanding_owned",
                understandingId,
                1,
            );
        }
        enqueueResourceGainBonusStateSync({
            commands: context.commands,
            world: entity,
            habitusIndex: context.cartridge.config?.habiti ?? {},
            understandingIndex: context.cartridge.config?.understanding ?? {},
            onUnknownHabitusId: (id) =>
                context.telemetry.log(
                    "errors",
                    `Unknown owned Habitus '${id}'.`,
                ),
            onUnknownUnderstandingId: (id) =>
                context.telemetry.log(
                    "errors",
                    `Unknown owned Understanding '${id}'.`,
                ),
        });
    }
}
