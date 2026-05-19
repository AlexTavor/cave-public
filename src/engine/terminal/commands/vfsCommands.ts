import {
    CommandDefinition,
    CommandInputHandler,
    CommandResult,
} from "../../../lib/terminal";
import { vfs } from "../../vfs/FileSystem";
import { DIR_MARKER_FILENAME, getPathSuggestions } from "../fileUtils";

const normalize = (value: string) => {
    let path = value.split("\\").join("/");
    while (path.startsWith("/")) path = path.slice(1);
    while (path.endsWith("/")) path = path.slice(0, -1);
    return path;
};
const isYes = (input: string) =>
    ["y", "yes"].includes(input.trim().toLowerCase());
const hideMarker = (path: string) => !path.endsWith(`/${DIR_MARKER_FILENAME}`);
const hasWildcard = (value: string) => value.includes("*");
const basename = (value: string) => {
    const segments = normalize(value).split("/");
    for (let i = segments.length - 1; i >= 0; i -= 1) {
        if (segments[i]) return segments[i];
    }
    return "";
};
const resolveMoveTarget = (from: string, toFolder: string) => {
    const folder = normalize(toFolder);
    const name = basename(from);
    if (!folder || folder === ".") return name;
    return `${folder}/${name}`;
};

type TreeNode = { name: string; type: string; children?: TreeNode[] };
const renderTree = (node: TreeNode): string[] => {
    const lines = ["."];
    const walk = (children: TreeNode[], prefix: string) => {
        const visible = children.filter(
            (child) => child.name !== DIR_MARKER_FILENAME,
        );
        visible.forEach((child, index) => {
            const isLast = index === visible.length - 1;
            const branch = `${prefix}${isLast ? "└── " : "├── "}`;
            lines.push(`${branch}${child.name}`);
            if (child.type !== "file")
                walk(
                    child.children ?? [],
                    `${prefix}${isLast ? "    " : "│   "}`,
                );
        });
    };
    walk(node.children ?? [], "");
    return lines;
};

const buildDeleteConfirmation = (paths: string[]): CommandResult => {
    const next: CommandInputHandler = async (input) => {
        if (!isYes(input)) return { type: "info", content: "Aborted" };
        await vfs.deletePaths(paths);
        return { type: "success", content: `Deleted ${paths.join(", ")}` };
    };
    const targetLabel =
        paths.length === 1 ? "target" : `${paths.length} targets`;
    return {
        type: "info",
        content: `[WARN] Delete ${targetLabel}? [y/N]`,
        next,
    };
};

type Handler = CommandDefinition["execute"];

const handlers: Record<string, Handler> = {
    "vfs-tree": handleVfsTree,
    "vfs-scan": handleVfsScan,
    "vfs-delete": handleVfsDelete,
    "vfs-move": handleVfsMove,
};

export const vfsCommands: CommandDefinition[] = [
    {
        name: "vfs-tree",
        description: "Print an ASCII tree for a virtual path.",
        usage: "vfs-tree [path] (alias: vfs.tree)",
        execute: handlers["vfs-tree"],
        autocomplete: (args) =>
            args.length <= 1 ? getPathSuggestions(args[0] ?? "", false) : [],
    },
    {
        name: "vfs-scan",
        description: "Find virtual files by glob pattern.",
        usage: "vfs-scan <glob> (alias: vfs.scan)",
        execute: handlers["vfs-scan"],
    },
    {
        name: "vfs-delete",
        description: "Delete one or more virtual files or directories.",
        usage: "vfs-delete <path...> (alias: vfs.delete)",
        execute: handlers["vfs-delete"],
        autocomplete: (args) =>
            args.length >= 1 ? getPathSuggestions(args.at(-1) ?? "") : [],
    },
    {
        name: "vfs-move",
        description: "Move a virtual file or folder into a destination folder.",
        usage: "vfs-move <from> <toFolder> (alias: vfs.move)",
        execute: handlers["vfs-move"],
        autocomplete: (args) => {
            if (args.length === 1) return getPathSuggestions(args[0] ?? "");
            if (args.length === 2)
                return getPathSuggestions(args[1] ?? "", false);
            return [];
        },
    },
];

async function handleVfsTree(args: string[]) {
    if (typeof vfs.tree !== "function")
        return {
            type: "error" as const,
            content: "vfs-tree unavailable in this runtime",
        };
    return {
        type: "success" as const,
        content: renderTree(await vfs.tree(args[0] ?? "")).join("\n"),
    };
}

async function handleVfsScan(args: string[]) {
    if (!args[0])
        return { type: "error" as const, content: "Usage: vfs.scan <glob>" };
    if (typeof vfs.scan !== "function")
        return {
            type: "error" as const,
            content: "vfs-scan unavailable in this runtime",
        };
    const query = hasWildcard(args[0]) ? args[0] : `*${args[0]}*`;
    const results = await vfs.scan(query);
    return {
        type: "success" as const,
        content: results.filter(hideMarker).join("\n") || "No matches",
    };
}

async function handleVfsDelete(args: string[]) {
    if (args.length === 0)
        return {
            type: "error" as const,
            content: "Usage: vfs.delete <path...>",
        };
    const paths = args.map(normalize);
    const files = (await vfs.listFiles()).filter(hideMarker);
    const hasDirectory = paths.some((path) =>
        files.some((file) => file.startsWith(`${path}/`)),
    );
    if (args.length > 1 || hasDirectory) return buildDeleteConfirmation(paths);
    await vfs.deletePaths(paths);
    return { type: "success" as const, content: `Deleted ${paths[0]}` };
}

async function handleVfsMove(args: string[]) {
    if (args.length !== 2)
        return {
            type: "error" as const,
            content: "Usage: vfs.move <from> <toFolder>",
        };
    const from = normalize(args[0]);
    const toFolder = normalize(args[1]);
    const files = await vfs.listFiles();
    const folderExists =
        !toFolder ||
        toFolder === "." ||
        files.some((file) => file.startsWith(`${toFolder}/`));
    if (!folderExists)
        return {
            type: "error" as const,
            content: `Target folder '${toFolder}' does not exist.`,
        };
    const to = resolveMoveTarget(from, toFolder);
    await vfs.movePaths([{ from, to }]);
    return { type: "success" as const, content: `Moved ${from} -> ${to}` };
}
