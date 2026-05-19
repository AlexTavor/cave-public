import { flattenTree } from "./projectUtils";
import type { TreeNode } from "../../../engine/vfs/types";

export const nextSelection = (
    path: string,
    modifier: "add" | "toggle" | "range",
    current: Set<string>,
    tree: TreeNode,
    expanded: Set<string>,
    anchorPath: string | null,
) => {
    if (modifier === "add") return new Set([path]);
    if (modifier === "toggle") {
        const next = new Set(current);
        next.has(path) ? next.delete(path) : next.add(path);
        return next;
    }
    const flat = flattenTree(tree, expanded);
    const anchor = anchorPath ?? path;
    const from = flat.indexOf(anchor);
    const to = flat.indexOf(path);
    if (from < 0 || to < 0) return new Set([path]);
    const [start, end] = from <= to ? [from, to] : [to, from];
    return new Set(flat.slice(start, end + 1));
};

export const toggleExpandedPath = (path: string, current: Set<string>) => {
    const next = new Set(current);
    next.has(path) ? next.delete(path) : next.add(path);
    return next;
};
