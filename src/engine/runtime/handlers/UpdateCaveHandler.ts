import { RuntimeCommandType, type UpdateCaveCommand } from "../types";
import type { CommandHandler, CommandHandlerContext } from "./types";
import {
    applyAttributes,
    applyMind,
    applyOwnedHabiti,
    applyOwnedUnderstanding,
    applyProgression,
    applyPurge,
    findEntityById,
} from "./updateCaveHandler.helpers";

export class UpdateCaveHandler implements CommandHandler<UpdateCaveCommand> {
    public readonly type = RuntimeCommandType.UPDATE_CAVE;

    public handle(
        command: UpdateCaveCommand,
        context: CommandHandlerContext,
    ): void {
        const {
            entityId,
            xp,
            level,
            skillpoints,
            xpRate,
            ownedHabiti,
            ownedUnderstanding,
            attributes,
            purge,
            mind,
        } = command.payload;
        const entity = findEntityById(context.world.entities, entityId);

        if (!entity) {
            context.telemetry.log(
                "errors",
                `UPDATE_CAVE failed: entity '${entityId}' not found.`,
            );
            return;
        }

        const cave = (entity as { cave?: Record<string, unknown> }).cave;
        if (!cave || typeof cave !== "object") {
            context.telemetry.log(
                "errors",
                `UPDATE_CAVE failed: entity '${entityId}' has no cave component.`,
            );
            return;
        }

        const component = cave;

        applyProgression(component, xp, level, skillpoints);

        if (typeof xpRate === "number") component.xpRate = xpRate;

        if (Array.isArray(ownedHabiti)) {
            applyOwnedHabiti(component, ownedHabiti);
        }

        if (Array.isArray(ownedUnderstanding)) {
            applyOwnedUnderstanding(component, ownedUnderstanding);
        }

        if (attributes) {
            applyAttributes(component, attributes);
        }

        if (purge) {
            applyPurge(component, purge);
        }

        if (mind) {
            applyMind(component, mind);
        }
    }
}

