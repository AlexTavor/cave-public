import type { RuntimeCommand, RuntimeEntity } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import { flushPendingTransfers } from "./dormancyFlush";

const WORLD_ID = "sys_world";

export class DormancyHandler implements CommandHandler<RuntimeCommand> {
    public readonly type = RuntimeCommandType.GAME_DORMANCY;

    public handle(
        command: RuntimeCommand,
        context: CommandHandlerContext,
    ): void {
        if (command.type !== RuntimeCommandType.GAME_DORMANCY) return;

        const worldEntity = context.world.entities.find(
            (entity) => entity.id === WORLD_ID,
        );

        if (!worldEntity) {
            context.telemetry.log(
                "errors",
                "Dormancy failed: sys_world entity missing.",
            );
            return;
        }

        // Complete any pending transfers before marking dormancy, so that transfers are not lost
        flushPendingTransfers(context);

        // Mark world so that it'll picked up by UI
        markWorldAsDormant(worldEntity);

        context.telemetry.log(
            "tick",
            `Dormancy triggered: ${command.payload.reason}`,
        );
    }
}

function markWorldAsDormant(worldEntity: RuntimeEntity) {
    const state = (worldEntity as { state?: Record<string, unknown> })
        .state as Record<string, unknown>;

    state.dormant = { value: 1, visible: false };
}

