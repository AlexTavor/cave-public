import {
    patchCommandMetadataInPlace,
    RuntimeCommandType,
    type KillCommand,
    type RuntimeEntity,
} from "../types";
import type { CommandHandler, CommandHandlerContext } from "./types";
import { enqueueMirroredFactAdjust } from "../factCommands";
import { removeBodyFromOwners } from "./removeBodyFromOwners";
import { killUnifiedBlueprints } from "./killUnifiedBlueprints";

const findEntityById = (
    entities: RuntimeEntity[],
    entityId: string,
): RuntimeEntity | undefined =>
    entities.find((entity) => entity.id === entityId);

export class KillHandler implements CommandHandler<KillCommand> {
    public readonly type = RuntimeCommandType.KILL;

    public handle(command: KillCommand, context: CommandHandlerContext): void {
        const { entityId } = command.payload;
        const target = findEntityById(context.world.entities, entityId);

        if (!target) {
            context.telemetry.log(
                "errors",
                `Kill skipped: entity '${entityId}' not found.`,
            );
            return;
        }

        if (typeof target.blueprintId === "string" && context.commands) {
            enqueueMirroredFactAdjust(
                context.commands,
                "blueprint_killed",
                target.blueprintId,
                1,
            );
        }
        const body = context.impulseEngine.getBody(entityId);
        if (body) {
            patchCommandMetadataInPlace(command, {
                deadBodyPresentation: {
                    x: body.x,
                    y: body.y,
                    radius: body.radius,
                },
            });
        }
        removeBodyFromOwners(context.world.entities, entityId);
        context.world.remove(target);
        context.impulseEngine.removeBody(entityId);
        killUnifiedBlueprints(command, target, context);
        context.telemetry.log("tick", `Killed entity '${entityId}'.`);
    }
}

