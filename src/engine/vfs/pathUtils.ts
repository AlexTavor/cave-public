import type { TreeNode } from "./types";

export function normalizePath(path: string): string {
    let value = path.replaceAll("\\", "/");
    while (value.startsWith("/")) value = value.slice(1);
    while (value.endsWith("/")) value = value.slice(0, -1);
    return value;
}

export function matchesPathOrPrefix(key: string, path: string): boolean {
    if (!path) return true;
    const normalized = normalizePath(path);
    return key === normalized || key.startsWith(`${normalized}/`);
}

export function moveKey(key: string, from: string, to: string): string {
    const source = normalizePath(from);
    const target = normalizePath(to);
    if (key === source) return target;
    return `${target}${key.slice(source.length)}`;
}

export function buildTree(keys: string[], root = ""): TreeNode {
    const normalizedRoot = normalizePath(root);
    const rootNode: TreeNode = {
        name: normalizedRoot.split("/").pop() || ".",
        path: normalizedRoot,
        type: "directory",
        children: [],
    };

    const nodeByPath = new Map<string, TreeNode>([[normalizedRoot, rootNode]]);
    const scopedKeys = keys
        .filter((key) => matchesPathOrPrefix(key, normalizedRoot))
        .sort((a, b) => a.localeCompare(b));

    for (const fullKey of scopedKeys) {
        const relative = normalizedRoot
            ? fullKey.slice(normalizedRoot.length).replace(/^\//, "")
            : fullKey;
        const parts = relative.split("/").filter(Boolean);
        let currentPath = normalizedRoot;

        parts.forEach((part, index) => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            if (!nodeByPath.has(currentPath)) {
                const parentPath = currentPath
                    .split("/")
                    .slice(0, -1)
                    .join("/");
                const parent = nodeByPath.get(parentPath) ?? rootNode;
                const node: TreeNode = {
                    name: part,
                    path: currentPath,
                    type: index === parts.length - 1 ? "file" : "directory",
                    children: index === parts.length - 1 ? undefined : [],
                };
                parent.children ??= [];
                parent.children.push(node);
                nodeByPath.set(currentPath, node);
            }
        });
    }

    sortTree(rootNode);
    return rootNode;
}

function sortTree(node: TreeNode): void {
    if (!node.children) return;
    node.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortTree);
}
