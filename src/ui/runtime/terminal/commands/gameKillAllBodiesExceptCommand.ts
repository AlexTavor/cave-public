import { CommandDefinition } from "../../../../lib/terminal";
import { RuntimeCommandType } from "../../../../engine/runtime/types";
import {
    buildInvalidArgsResult,
    gameKillAllBodiesExceptSchema,
} from "../runtimeConstants";

export const gameKillAllBodiesExceptCommand: CommandDefinition = {
    name: "game.kill-all-bodies-except",
    description:
        "Queue kills until only the requested owned body count remains",
    usage: "game.kill-all-bodies-except <quantity>",
    execute: (args, context) => {
        const parsed = gameKillAllBodiesExceptSchema.safeParse(args);
        if (!parsed.success) {
            return buildInvalidArgsResult("game.kill-all-bodies-except");
        }

        const [quantity] = parsed.data;
        const runtime = context.runtime?.getRuntime?.();
        if (!runtime) {
            return {
                type: "error",
                content: "Runtime not initialized. Run game.new first.",
            };
        }

        runtime.commands.enqueue({
            type: RuntimeCommandType.KILL_ALL_BODIES_EXCEPT,
            payload: { quantity },
        });

        return {
            type: "success",
            content: `Kill-all-bodies-except queued for ${quantity}.`,
        };
    },
};
