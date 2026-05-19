import type { RuntimeEntity, UpdateAssignmentCommand } from "../types";
import { RuntimeCommandType } from "../types";
import type { CommandHandler, CommandHandlerContext } from "./types";

const findEntityById = (
    entities: RuntimeEntity[],
    entityId: string,
): RuntimeEntity | undefined =>
    entities.find((entity) => entity.id === entityId);

export class UpdateAssignmentHandler implements CommandHandler<UpdateAssignmentCommand> {
    public readonly type = RuntimeCommandType.UPDATE_ASSIGNMENT;

    public handle(
        command: UpdateAssignmentCommand,
        context: CommandHandlerContext,
    ): void {
        const { entityId, assignedIds } = command.payload;
        const entity = findEntityById(context.world.entities, entityId);

        if (!entity) {
            context.telemetry.log(
                "errors",
                `UPDATE_ASSIGNMENT failed: entity '${entityId}' not found.`,
            );
            return;
        }

        const assignment = (entity as { assignment?: Record<string, unknown> })
            .assignment;

        if (!assignment || typeof assignment !== "object") {
            context.telemetry.log(
                "errors",
                `UPDATE_ASSIGNMENT failed: entity '${entityId}' has no assignment.`,
            );
            return;
        }

        (entity as { assignment: Record<string, unknown> }).assignment = {
            ...assignment,
            assignedIds: [...assignedIds],
        };
    }
}
