import { CommandDefinition } from "../../lib/terminal";
import { vfs } from "../vfs/FileSystem";
import { fileCache } from "./fileUtils";

export const lsCommand: CommandDefinition = {
    name: "ls",
    description: "List files in the Virtual File System.",
    usage: "ls",
    execute: async () => {
        try {
            const files = await vfs.listFiles();
            // Update cache since we have fresh data
            fileCache.length = 0;
            fileCache.push(...files);

            if (files.length === 0) {
                return { type: "info", content: "No files found." };
            }
            return { type: "success", content: files.join("\n") };
        } catch (e: unknown) {
            return {
                type: "error",
                content: `LS Failed: ${e instanceof Error ? e.message : String(e)}`,
            };
        }
    },
};
