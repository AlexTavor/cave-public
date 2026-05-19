import type { TreeNode } from "../../../engine/vfs/types";

export const DIR_MARKER_FILENAME = ".cave-dir";

export const normalizePath = (value: string) =>
    value.replaceAll("\\", "/").replace(/^\/+/, "").replace(/\/+$/, "");

export const basename = (path: string) => {
    const normalized = normalizePath(path);
    const segments = normalized.split("/");
    return segments.at(-1) ?? "";
};

export const isChildPath = (path: string, root: string) => {
    const a = normalizePath(path);
    const b = normalizePath(root);
    return Boolean(b) && (a === b || a.startsWith(`${b}/`));
};

export const flattenTree = (tree: TreeNode, expanded: Set<string>) => {
    const items: string[] = [];
    const walk = (node: TreeNode) => {
        if (node.path && !node.path.endsWith(`/${DIR_MARKER_FILENAME}`)) {
            items.push(node.path);
        }
        if (node.type === "directory" && expanded.has(node.path)) {
            (node.children ?? []).forEach(walk);
        }
    };
    (tree.children ?? []).forEach(walk);
    return items;
};

export const findNodeByPath = (
    tree: TreeNode,
    path: string,
): TreeNode | null => {
    if (tree.path === path) return tree;
    for (const child of tree.children ?? []) {
        const found = findNodeByPath(child, path);
        if (found) return found;
    }
    return null;
};
