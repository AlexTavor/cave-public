import { CommandDefinition } from "../../../../lib/terminal";
import { getCommandRuntime } from "../getCommandRuntime";
import { RuntimeCommandType } from "../../../../engine/runtime/types";
import {
    buildInvalidArgsResult,
    gamePositionSchema,
} from "../runtimeConstants";

export const gamePositionCommand: CommandDefinition = {
    name: "game.position",
    description: "Set an entity's physics position",
    usage: "game.position <entityId> <x> <y>",
    execute: (args, context) => {
        const parsed = gamePositionSchema.safeParse(args);
        if (!parsed.success) return buildInvalidArgsResult("game.position");

        const [entityId, xRaw, yRaw] = parsed.data;
        const x = Number(xRaw);
        const y = Number(yRaw);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return buildInvalidArgsResult("game.position");
        }

        const runtime = getCommandRuntime(context);
        if (!runtime) {
            return {
                type: "error",
                content: "Runtime not initialized. Run game.new first.",
            };
        }

        runtime.commands.enqueue({
            type: RuntimeCommandType.POSITION_ENTITY,
            payload: {
                id: entityId,
                x,
                y,
            },
        });

        return {
            type: "success",
            content: `Position queued for '${entityId}'.`,
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
