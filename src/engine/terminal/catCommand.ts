import { CommandDefinition } from "../../lib/terminal";
import { vfs } from "../vfs/FileSystem";
import { getFileSuggestions } from "./fileUtils";

export const catCommand: CommandDefinition = {
    name: "cat",
    description: "Display file contents.",
    usage: "cat [filename]",
    execute: async (args) => {
        if (args.length === 0)
            return { type: "error", content: "Usage: cat [filename]" };

        try {
            const data = await vfs.readFile(args[0]);
            if (!data)
                return {
                    type: "error",
                    content: `File '${args[0]}' not found.`,
                };

            // Pretty print the JSON
            return {
                type: "output",
                content: JSON.stringify(data, null, 2),
            };
        } catch (e: unknown) {
            return {
                type: "error",
                content: `Read Failed: ${e instanceof Error ? e.message : String(e)}`,
            };
        }
    },
    autocomplete: getFileSuggestions,
};
