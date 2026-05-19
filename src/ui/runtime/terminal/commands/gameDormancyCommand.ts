import { CommandDefinition } from "../../../../lib/terminal";
import { RuntimeCommandType } from "../../../../engine/runtime/types";

export const gameDormancyCommand: CommandDefinition = {
    name: "game.dormancy",
    description: "Trigger dormancy (board wipe, enter dormant state)",
    usage: "game.dormancy",
    execute: (_args, context) => {
        const runtime = context.runtime?.getRuntime?.();
        if (!runtime) {
            return {
                type: "error",
                content: "Runtime not initialized. Run game.new first.",
            };
        }

        runtime.commands.enqueue({
            type: RuntimeCommandType.GAME_DORMANCY,
            payload: { reason: "manual" },
        });

        return {
            type: "success",
            content: "Dormancy triggered.",
        };
    },
};
