import { CommandDefinition } from "../../../../lib/terminal";
import { RuntimeCommandType } from "../../../../engine/runtime/types";
import { buildInvalidArgsResult, gameKillSchema } from "../runtimeConstants";

export const gameKillCommand: CommandDefinition = {
    name: "game.kill",
    description: "Queue a kill command for an entity",
    usage: "game.kill <entityId>",
    execute: (args, context) => {
        const parsed = gameKillSchema.safeParse(args);
        if (!parsed.success) return buildInvalidArgsResult("game.kill");

        const [entityId] = parsed.data;
        const runtime = context.runtime?.getRuntime?.();
        if (!runtime) {
            return {
                type: "error",
                content: "Runtime not initialized. Run game.new first.",
            };
        }

        runtime.commands.enqueue({
            type: RuntimeCommandType.KILL,
            payload: {
                entityId,
            },
        });

        return {
            type: "success",
            content: `Kill queued for '${entityId}'.`,
        };
    },
    autocomplete: (args, context) => {
        if (args.length === 1 && context.runtime) {
            const ids = context.runtime.getActiveEntityIds();
            const token = args[0].toLowerCase();
            return ids
                .filter((id) => id.toLowerCase().startsWith(token))
                .map((id) => ({
                    label: id,
                    type: "value" as const,
                    insertText: id,
                }));
        }
        return [];
    },
};
