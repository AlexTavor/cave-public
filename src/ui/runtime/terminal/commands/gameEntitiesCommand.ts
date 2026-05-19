import { CommandDefinition } from "../../../../lib/terminal";
import {
    buildInvalidArgsResult,
    gameEntitiesSchema,
} from "../runtimeConstants";

export const gameEntitiesCommand: CommandDefinition = {
    name: "game.entities",
    description: "List entities currently in the runtime world",
    usage: "game.entities",
    execute: (args, context) => {
        const parsed = gameEntitiesSchema.safeParse(args);
        if (!parsed.success) return buildInvalidArgsResult("game.entities");

        const runtime = context.runtime?.getRuntime?.();
        if (!runtime) {
            return {
                type: "error",
                content: "Runtime not initialized. Run game.new first.",
            };
        }

        const entities = runtime.getEntities();
        return {
            type: "output",
            content: entities.map((e) => JSON.stringify(e)).join("\n\n"),
        };
    },
    autocomplete: () => [],
};
