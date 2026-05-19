import fs from "node:fs";
import path from "node:path";
import { normalizeProjectPath } from "./shared";

export interface TreeNode {
    name: string;
    path: string;
    type: "file" | "directory";
    children?: TreeNode[];
}

export const scanDirectoryRecursively = (dir: string): string[] => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);
        return entry.isDirectory()
            ? scanDirectoryRecursively(fullPath)
            : [normalizeProjectPath(fullPath)];
    });
};

export const getDirectoryTree = (dir: string): TreeNode => {
    const name = path.basename(dir);
    const relativePath = normalizeProjectPath(dir);
    const stats = fs.existsSync(dir) ? fs.statSync(dir) : null;
    if (stats && !stats.isDirectory()) {
        return { name, path: relativePath, type: "file" };
    }
    const children = fs.existsSync(dir)
        ? fs
              .readdirSync(dir, { withFileTypes: true })
              .sort(
                  (a, b) =>
                      Number(b.isDirectory()) - Number(a.isDirectory()) ||
                      a.name.localeCompare(b.name),
              )
              .map((entry) => {
                  const childPath = path.join(dir, entry.name);
                  return entry.isDirectory()
                      ? getDirectoryTree(childPath)
                      : {
                            name: entry.name,
                            path: normalizeProjectPath(childPath),
                            type: "file" as const,
                        };
              })
        : [];
    return { name, path: relativePath, type: "directory", children };
};
