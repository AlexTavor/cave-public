import type { RuntimeCommand, RuntimeEntity } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";

const findEntityById = (
    entities: RuntimeEntity[],
    entityId: string,
): RuntimeEntity | undefined =>
    entities.find((entity) => entity.id === entityId);

export class SetTargetHandler implements CommandHandler<RuntimeCommand> {
    public readonly type = RuntimeCommandType.SET_TARGET;

    public handle(
        command: RuntimeCommand,
        context: CommandHandlerContext,
    ): void {
        if (command.type !== RuntimeCommandType.SET_TARGET) return;
        const { entityId, targetId } = command.payload;
        const entity = findEntityById(context.world.entities, entityId);

        if (!entity) {
            context.telemetry.log(
                "errors",
                `SET_TARGET failed: entity '${entityId}' not found.`,
            );
            return;
        }

        context.impulseEngine.setTarget(entityId, targetId);
        context.telemetry.log(
            "tick",
            `SET_TARGET: '${entityId}' -> '${targetId ?? "none"}'.`,
        );
    }
}
