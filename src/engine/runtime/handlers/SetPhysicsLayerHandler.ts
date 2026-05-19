import type { RuntimeCommand } from "../types";
import { RuntimeCommandType } from "../types";
import type { CommandHandler, CommandHandlerContext } from "./types";

export class SetPhysicsLayerHandler implements CommandHandler<RuntimeCommand> {
    public readonly type = RuntimeCommandType.SET_PHYSICS_LAYER;

    public handle(
        command: RuntimeCommand,
        context: CommandHandlerContext,
    ): void {
        if (command.type !== RuntimeCommandType.SET_PHYSICS_LAYER) return;
        const body = context.impulseEngine.getBody(command.payload.entityId);
        if (!body) {
            context.telemetry.log(
                "errors",
                `SET_PHYSICS_LAYER failed: '${command.payload.entityId}' has no physics body.`,
            );
            return;
        }
        body.layer = command.payload.layer;
    }
}
