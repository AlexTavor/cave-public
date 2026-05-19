import { CommandDefinition } from "../../lib/terminal";
import { vfs } from "../vfs/FileSystem";
import { getFileSuggestions, refreshFileCache } from "./fileUtils";

export const rmCommand: CommandDefinition = {
    name: "rm",
    description: "Remove a file.",
    usage: "rm [filename]",
    execute: async (args) => {
        if (args.length === 0)
            return { type: "error", content: "Usage: rm [filename]" };

        const filename = args[0];
        try {
            // Confirm existence first
            const exists = await vfs.readFile(filename);
            if (!exists) {
                return {
                    type: "error",
                    content: `File '${filename}' not found.`,
                };
            }

            if (filename === "core.json") {
                return {
                    type: "error",
                    content: "Cannot remove core system files.",
                };
            }

            await vfs.deleteFile(filename);
            refreshFileCache(); // Update autocomplete cache
            return { type: "success", content: `Deleted '${filename}'` };
        } catch (e: unknown) {
            return {
                type: "error",
                content: `Delete Failed: ${e instanceof Error ? e.message : String(e)}`,
            };
        }
    },
    autocomplete: getFileSuggestions,
};
