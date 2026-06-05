import { CommandDefinition } from "../../../../lib/terminal";
import { getCommandRuntime } from "../getCommandRuntime";
import { RuntimeCommandType } from "../../../../engine/runtime/types";
import { buildInvalidArgsResult, setTargetSchema } from "../runtimeConstants";

const resolveRuntime = (context: { runtime?: any }) =>
    getCommandRuntime(context);

export const setTargetCommand: CommandDefinition = {
    name: "target.set",
    description: "Set or clear a steering target for an entity",
    usage: "target.set <entityId> [targetId]",
    execute: (args, context) => {
        const parsed = setTargetSchema.safeParse(args);
        if (!parsed.success) return buildInvalidArgsResult("target.set");
        const runtime = resolveRuntime(context);
        if (!runtime) {
            return {
                type: "error",
                content: "Runtime not initialized. Run game.new first.",
            };
        }
        const [entityId, targetRaw] = parsed.data;
        const targetId =
            targetRaw === undefined || targetRaw === "null" || targetRaw === "none"
                ? null
                : targetRaw;
        runtime.commands.enqueue({
            type: RuntimeCommandType.SET_TARGET,
            payload: { entityId, targetId },
        });
        return {
            type: "success",
            content: `Target updated for '${entityId}'.`,
        };
    },
    autocomplete: (args, context) => {
        if (!context.runtime) return [];
        const token = (args.at(-1) ?? "").toLowerCase();
        const ids = context.runtime.getActiveEntityIds();
        if (args.length === 1) {
            return ids
                .filter((id) => id.toLowerCase().startsWith(token))
                .map((id) => ({ label: id, type: "value" as const, insertText: id }));
        }
        if (args.length === 2) {
            return [...ids, "null"]
                .map((label) => ({ label, type: "value" as const, insertText: label }))
                .filter((entry) => entry.label.toLowerCase().startsWith(token));
        }
        return [];
    },
};