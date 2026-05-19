import { CommandDefinition } from "../../../../lib/terminal";
import { RuntimeCommandType } from "../../../../engine/runtime/types";
import { buildInvalidArgsResult, gameSpawnSchema } from "../runtimeConstants";
import { workspaceService } from "../../../../engine/terminal/commands/projectServices";

export const gameSpawnCommand: CommandDefinition = {
    name: "game.spawn",
    description: "Queue a spawn command for a blueprint",
    usage: "game.spawn <blueprintId> [id]",
    execute: (args, context) => {
        const parsed = gameSpawnSchema.safeParse(args);
        if (!parsed.success) return buildInvalidArgsResult("game.spawn");

        const [blueprintId, id] = parsed.data;
        const runtime = context.runtime?.getRuntime?.();
        if (!runtime) {
            return {
                type: "error",
                content: "Runtime not initialized. Run game.new first.",
            };
        }

        runtime.commands.enqueue({
            type: RuntimeCommandType.SPAWN,
            payload: {
                blueprintId,
                id,
            },
        });

        return {
            type: "success",
            content: `Spawn queued for '${blueprintId}'.`,
        };
    },
    autocomplete: (args, context) => {
        if (args.length !== 1) return [];
        const token = args[0].toLowerCase();
        const modules = context.resources?.getModules?.() ?? [];
        const moduleIds = modules.flatMap((module) =>
            Object.keys(module.blueprints ?? {}),
        );
        const symbols = workspaceService.getSymbols();
        return Array.from(new Set([...symbols, ...moduleIds]))
            .filter((id) => id.toLowerCase().startsWith(token))
            .map((id) => ({
                label: id,
                type: "value" as const,
                insertText: id,
            }));
    },
};
