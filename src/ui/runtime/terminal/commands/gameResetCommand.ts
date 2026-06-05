import type { CommandDefinition } from "../../../../lib/terminal";
import { getCommandRuntime } from "../getCommandRuntime";

export const gameResetCommand: CommandDefinition = {
    name: "game.reset",
    description:
        "Reset runtime state: destroy ECS entities, clear commands, restart world.",
    usage: "game.reset",
    execute: (_args, context) => {
        const runtime = getCommandRuntime(context);
        if (!runtime) {
            return { type: "error", content: "Runtime not ready." };
        }

        context.runtime?.reset?.();

        return { type: "success", content: "Runtime reset." };
    },
};
