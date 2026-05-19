import type { PositionEntityCommand, RuntimeEntity } from "../types";
import { RuntimeCommandType } from "../types";
import type { CommandHandler, CommandHandlerContext } from "./types";

const findEntityById = (
    entities: RuntimeEntity[],
    entityId: string,
): RuntimeEntity | undefined =>
    entities.find((entity) => entity.id === entityId);

const resolvePhysicsComponent = (
    entity: RuntimeEntity,
): { x?: number; y?: number } | null => {
    const physics = entity.physics as { x?: number; y?: number } | undefined;

    if (!physics || typeof physics !== "object") {
        return null;
    }

    return physics;
};

const isSamePosition = (
    physics: { x?: number; y?: number },
    x: number,
    y: number,
): boolean => physics.x === x && physics.y === y;

export class PositionHandler implements CommandHandler<PositionEntityCommand> {
    public readonly type = RuntimeCommandType.POSITION_ENTITY;

    public handle(
        command: PositionEntityCommand,
        context: CommandHandlerContext,
    ): void {
        const { id, x, y } = command.payload;
        const entity = findEntityById(context.world.entities, id);

        if (!entity) {
            context.telemetry.log(
                "errors",
                `Position failed: entity '${id}' not found.`,
            );
            return;
        }

        const physics = resolvePhysicsComponent(entity);
        if (!physics) {
            context.telemetry.log(
                "errors",
                `Position failed: entity '${id}' has no physics component.`,
            );
            return;
        }
        if (isSamePosition(physics, x, y)) return;

        physics.x = x;
        physics.y = y;

        const body = context.impulseEngine.getBody(id);
        if (body) {
            body.position.x = x;
            body.position.y = y;
            body.prevPosition.x = x;
            body.prevPosition.y = y;
            body.acceleration.x = 0;
            body.acceleration.y = 0;
            body.x = x;
            body.y = y;
        }
    }
}

