import { CommandDefinition } from "../../../../lib/terminal";
import { vfs } from "../../../../engine/vfs/FileSystem";
import {
    getFileSuggestions,
    refreshFileCache,
} from "../../../../engine/terminal/fileUtils";
import { buildInvalidArgsResult, loadSchema } from "../runtimeConstants";

export const loadCommand: CommandDefinition = {
    name: "load",
    description: "Fetch a file from disk and persist it to the VFS",
    usage: "load <filename>",
    execute: async (args) => {
        const parsed = loadSchema.safeParse(args);
        if (!parsed.success) return buildInvalidArgsResult("load");

        const [filename] = parsed.data;

        try {
            // 1. Force fetch from disk (bypassing DB cache if possible via readText behavior)
            // Note: vfs.readText currently fetches from disk directly.
            const content = await vfs.readText(filename);

            if (content === null) {
                return {
                    type: "error",
                    content: `File '${filename}' not found on disk.`,
                };
            }

            // 2. Write to DB to register it in VFS and make it discoverable (ls)
            // We cast to any because VFS types are strict about ModuleCartridge,
            // but IDB supports strings/mixed content.
            await vfs.writeFile(filename, content as any);

            // 3. Refresh autocomplete cache
            refreshFileCache();

            return {
                type: "success",
                content: `Successfully loaded '${filename}' into VFS.`,
            };
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            return {
                type: "error",
                content: `Load failed: ${message}`,
            };
        }
    },
    autocomplete: getFileSuggestions,
};
