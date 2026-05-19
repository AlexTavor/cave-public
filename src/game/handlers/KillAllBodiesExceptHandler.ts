import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import type { RuntimeCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types/runtimeCommandTypes";
import { readWorldSeed } from "../../utils/worldSeed";
import { resolveBodiesToKill } from "./killBodiesExcept";

export class KillAllBodiesExceptHandler implements CommandHandler<RuntimeCommand> {
    public readonly type = RuntimeCommandType.KILL_ALL_BODIES_EXCEPT;

    public handle(
        command: RuntimeCommand,
        context: CommandHandlerContext,
    ): void {
        if (command.type !== RuntimeCommandType.KILL_ALL_BODIES_EXCEPT) return;
        if (!context.commands) return;
        const quantity = Math.max(0, Math.floor(command.payload.quantity));
        const world = context.world.entities.find(
            (entity) => entity.id === "sys_world",
        );
        const entityIds = resolveBodiesToKill({
            entities: context.world.entities,
            cartridge: context.cartridge,
            impulseEngine: context.impulseEngine,
            quantity,
            worldSeed: readWorldSeed(
                { state: world?.state as Record<string, unknown> | undefined },
                "world",
            ),
        });
        entityIds.forEach((entityId) => {
            context.commands?.enqueue({
                type: RuntimeCommandType.KILL,
                payload: { entityId },
                metadata: command.metadata
                    ? { ...command.metadata }
                    : undefined,
            });
        });
        context.telemetry.log(
            "tick",
            `Queued ${entityIds.length} body kills to leave ${quantity}.`,
        );
    }
}
