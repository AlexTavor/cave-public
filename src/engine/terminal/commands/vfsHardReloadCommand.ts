import { CommandDefinition } from "../../../lib/terminal";
import { vfs } from "../../vfs/FileSystem";
import { refreshFileCache } from "../fileUtils";
import { isSupportedFsFile, SOURCE_ROOT } from "./fsSemanticFiles";
import { flattenTree, toVfsKey } from "./fsCommandPaths";

type TreeNode = {
    path: string;
    type: "file" | "directory";
    children?: TreeNode[];
};

export const vfsHardReloadCommand: CommandDefinition = {
    name: "vfs-hardreload",
    description: "Wipe every VFS entry and replace with files read from disk.",
    usage: "vfs-hardreload (alias: vfs.hardReload)",
    execute: async () => {
        try {
            const existing = await vfs.listFiles();
            if (existing.length > 0) await vfs.deletePaths(existing);

            const treeRes = await fetch("/__editor/tree", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ root: SOURCE_ROOT }),
            });
            if (!treeRes.ok)
                return {
                    type: "error" as const,
                    content: `Disk read failed: ${treeRes.status}`,
                };

            const files = flattenTree(
                (await treeRes.json()) as TreeNode,
            ).filter(isSupportedFsFile);

            await Promise.all(
                files.map(async (path) => {
                    const res = await fetch(
                        `/__editor/read?path=${encodeURIComponent(path)}`,
                    );
                    if (!res.ok) return;
                    const data = path.endsWith(".cvs")
                        ? await res.text()
                        : await res.json();
                    await vfs.writeFile(toVfsKey(path), data);
                }),
            );

            refreshFileCache();
            return {
                type: "success" as const,
                content: `Hard-reloaded ${files.length} file(s) from disk.`,
            };
        } catch (error) {
            return {
                type: "error" as const,
                content: `Hard-reload failed: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
};
