import { CommandDefinition } from "../../../lib/terminal";
import { vfs } from "../../vfs/FileSystem";
import { refreshFileCache } from "../fileUtils";
import { isSupportedFsFile, SOURCE_ROOT } from "./fsSemanticFiles";
import { flattenTree, toDiskRoot, toVfsKey } from "./fsCommandPaths";

type TreeNode = {
    path: string;
    type: "file" | "directory";
    children?: TreeNode[];
};

type Handler = CommandDefinition["execute"];

const handlers: Record<string, Handler> = {
    "fs-load": handleFsLoad,
    "fs-load-tree": handleFsLoadTree,
    "fs-save": handleFsSave,
};

const normalizeScope = (value?: string) => {
    let path = value?.trim() ?? "";
    while (path.startsWith("/")) path = path.slice(1);
    while (path.endsWith("/")) path = path.slice(0, -1);
    return path;
};

const loadFolder: CommandDefinition = {
    name: "fs-load",
    description: "Load semantic content files from a disk folder into VFS.",
    usage: "fs-load [folder] (alias: fs.load)",
    execute: handlers["fs-load"],
};

const loadTree: CommandDefinition = {
    name: "fs-load-tree",
    description: "Load the complete source tree into VFS.",
    usage: "fs-load-tree (alias: fs.loadTree)",
    execute: handlers["fs-load-tree"],
};

const saveFolder: CommandDefinition = {
    name: "fs-save",
    description: "Save VFS semantic content files into a disk folder.",
    usage: "fs-save [folder] (alias: fs.save)",
    execute: handlers["fs-save"],
};

export const fsCommands: CommandDefinition[] = [
    loadFolder,
    loadTree,
    saveFolder,
];

async function handleFsLoad(args: string[]) {
    try {
        const root = toDiskRoot(args[0]);
        const treeRes = await fetch("/__editor/tree", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ root }),
        });
        if (!treeRes.ok)
            return {
                type: "error" as const,
                content: `Load failed: ${treeRes.status}`,
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
            content: `Loaded ${files.length} file(s) from ${root}`,
        };
    } catch (error) {
        return {
            type: "error" as const,
            content: `Load failed: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}

async function handleFsLoadTree() {
    return handleFsLoad([]);
}

async function handleFsSave(args: string[]) {
    try {
        const scope = normalizeScope(args[0]);
        const root = toDiskRoot(args[0]);
        const allFiles = (await vfs.listFiles()).filter((file) =>
            isSupportedFsFile(`${SOURCE_ROOT}/${file}`),
        );
        const files = scope
            ? allFiles.filter(
                  (file) => file === scope || file.startsWith(`${scope}/`),
              )
            : allFiles;
        for (const file of files) {
            const relative = scope
                ? file.replace(new RegExp(`^${scope}/?`), "")
                : file;
            const data = await vfs.readFile(file);
            if (data == null) continue;
            const path = `${root}/${relative}`;
            const res = await fetch("/__editor/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path, content: data }),
            });
            if (!res.ok)
                return {
                    type: "error" as const,
                    content: `Save failed for ${file}`,
                };
        }
        return {
            type: "success" as const,
            content: `Saved ${files.length} file(s) to ${root}`,
        };
    } catch (error) {
        return {
            type: "error" as const,
            content: `Save failed: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
