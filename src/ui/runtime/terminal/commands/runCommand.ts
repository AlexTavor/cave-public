import { vfs } from "../../../../engine/vfs/FileSystem";
import { CommandDefinition } from "../../../../lib/terminal";
import {
    fileCache,
    refreshFileCache,
} from "../../../../engine/terminal/fileUtils";
import { buildInvalidArgsResult, runSchema } from "../runtimeConstants";

const isExecutableLine = (line: string): boolean => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith("#");
};

export const runCommand: CommandDefinition = {
    name: "run",
    description: "Execute a Cave script (.cvs) line by line",
    usage: "run <filename>",
    execute: async (args, context) => {
        const parsed = runSchema.safeParse(args);
        if (!parsed.success) return buildInvalidArgsResult("run");

        const [filename] = parsed.data;
        refreshFileCache();

        const contents = await vfs.readText(filename);
        if (!contents) {
            return {
                type: "error",
                content: `Script '${filename}' not found or unreadable.`,
            };
        }

        const lines = contents
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(isExecutableLine);

        let executed = 0;
        for (const line of lines) {
            const result = await context.registry.execute(line, context);
            if (result.type === "error") {
                const detail =
                    typeof result.content === "string"
                        ? result.content
                        : "Non-text error";
                return {
                    type: "error",
                    content: `Script failed at line ${executed + 1}: '${line}' -> ${detail}`,
                };
            }
            executed += 1;
        }

        return {
            type: "success",
            content: `Executed ${executed} command(s) from '${filename}'.`,
        };
    },
    autocomplete: (args) => {
        if (args.length <= 1) {
            const token = (args[0] || "").toLowerCase();
            return fileCache
                .filter((file) => file.toLowerCase().endsWith(".cvs"))
                .filter((file) => file.toLowerCase().startsWith(token))
                .map((file) => ({
                    label: file,
                    type: "value" as const,
                    insertText: file,
                }));
        }
        return [];
    },
};
