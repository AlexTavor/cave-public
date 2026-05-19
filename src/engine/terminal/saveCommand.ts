import { CommandDefinition } from "../../lib/terminal";
import { vfs } from "../vfs/FileSystem";
import { getFileSuggestions } from "./fileUtils";

export const saveCommand: CommandDefinition = {
    name: "save",
    description: "Dump a VFS file to disk via the editor middleware.",
    usage: "save [filename]",
    execute: async (args) => {
        const filename = args[0] || "game_data.bp";

        try {
            await vfs.saveToDisk(filename);
            return {
                type: "success",
                content: `Successfully saved '${filename}' to source.`,
            };
        } catch (e: unknown) {
            return {
                type: "error",
                content: `Save Failed: ${e instanceof Error ? e.message : String(e)}`,
            };
        }
    },
    autocomplete: getFileSuggestions,
};
