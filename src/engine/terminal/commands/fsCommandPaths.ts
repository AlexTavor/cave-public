import { SOURCE_ROOT } from "./fsSemanticFiles";

type TreeNode = {
    path: string;
    type: "file" | "directory";
    children?: TreeNode[];
};

const normalize = (value: string) => {
    let path = value.split("\\").join("/");
    while (path.startsWith("/")) path = path.slice(1);
    while (path.endsWith("/")) path = path.slice(0, -1);
    return path;
};

export const toDiskRoot = (value?: string) => {
    const path = normalize(value ?? "");
    return path ? `${SOURCE_ROOT}/${path}` : SOURCE_ROOT;
};

export const flattenTree = (node: TreeNode): string[] => {
    if (node.type === "file") return [node.path];
    return (node.children ?? []).flatMap((child) => flattenTree(child));
};

export const toVfsKey = (diskPath: string) =>
    diskPath.replace(new RegExp(`^${SOURCE_ROOT}/?`), "");
