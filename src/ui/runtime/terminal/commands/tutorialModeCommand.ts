import { CommandDefinition } from "../../../../lib/terminal";
import {
    buildInvalidArgsResult,
    tutorialModeSchema,
} from "../runtimeConstants";
import { restoreTutorialMode } from "../../tutorials/tutorialModeMemory";

const resolveRuntime = (context: { runtime?: any }) =>
    context.runtime?.getRuntime?.() ?? null;

const parseTutorialMode = (value: string): 0 | 1 | null => {
    const normalized = value.toLowerCase();
    if (normalized === "true") return 1;
    if (normalized === "false") return 0;
    return null;
};

export const tutorialModeCommand: CommandDefinition = {
    name: "tutorial_mode",
    description: "Enable or disable persistent tutorial resource protection",
    usage: "tutorial_mode true|false",
    execute: (args, context) => {
        const parsed = tutorialModeSchema.safeParse(args);
        if (!parsed.success) return buildInvalidArgsResult("tutorial_mode");
        const nextMode = parseTutorialMode(parsed.data[0]);
        if (nextMode == null) return buildInvalidArgsResult("tutorial_mode");
        const runtime = resolveRuntime(context);
        if (!runtime) return { type: "error", content: "Runtime not ready." };
        restoreTutorialMode(runtime, nextMode);
        return {
            type: "success",
            content: `tutorial_mode ${nextMode === 1 ? "true" : "false"}`,
        };
    },
    autocomplete: (args) => {
        if (args.length !== 1) return [];
        const token = (args[0] ?? "").toLowerCase();
        return ["true", "false"]
            .filter((value) => value.startsWith(token))
            .map((value) => ({
                label: value,
                type: "value" as const,
                insertText: value,
            }));
    },
};
