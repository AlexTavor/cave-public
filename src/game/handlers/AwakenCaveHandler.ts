import type { RuntimeCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";

export class AwakenCaveHandler implements CommandHandler<RuntimeCommand> {
    public readonly type = RuntimeCommandType.AWAKEN_CAVE;

    public handle(
        command: RuntimeCommand,
        context: CommandHandlerContext,
    ): void {
        if (command.type !== RuntimeCommandType.AWAKEN_CAVE) return;

        if (!context.executeCommand) {
            throw new Error(
                "DormancyHandler requires executeCommand in context",
            );
        }

        context.executeCommand?.("game.rebirth");

        context.telemetry.log("tick", "Cave awakened. New cycle begins.");
    }
}
