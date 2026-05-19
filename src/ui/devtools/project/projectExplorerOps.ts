import { createEmptyCartridge } from "../../../engine/vfs/bootstrap";
import { vfs } from "../../../engine/vfs/FileSystem";
import type { TreeNode } from "../../../engine/vfs/types";
import { recordProjectSnapshot } from "../state/useProjectHistoryStore";
import { resolveNewFileContent } from "./newFileTemplates";
import { registerBlueprintInActiveManifest } from "./registerBlueprintInActiveManifest";
import {
    DIR_MARKER_FILENAME,
    basename,
    findNodeByPath,
    isChildPath,
    normalizePath,
} from "./projectUtils";

export const moveExplorerPaths = async (
    tree: TreeNode,
    sourcePaths: string[],
    targetPath: string,
) => {
    const normalizedTarget = normalizePath(targetPath);
    const target = findNodeByPath(tree, normalizedTarget);
    if (target?.type !== "directory")
        throw new Error("Target must be a folder.");
    sourcePaths.forEach((source) => {
        if (isChildPath(normalizedTarget, source)) {
            throw new Error("Cannot move into own child.");
        }
    });
    await recordProjectSnapshot();
    const moves = sourcePaths.map((from) => ({
        from: normalizePath(from),
        to: normalizedTarget
            ? `${normalizedTarget}/${basename(from)}`
            : basename(from),
    }));
    await vfs.movePaths(moves);
};

export const deleteExplorerPaths = async (paths: string[]) => {
    await recordProjectSnapshot();
    await vfs.deletePaths(paths.map(normalizePath));
};

export const renameExplorerPath = async (path: string, newName: string) => {
    await recordProjectSnapshot();
    const parent = normalizePath(path).split("/").slice(0, -1).join("/");
    const to = parent ? `${parent}/${newName}` : newName;
    await vfs.movePaths([{ from: normalizePath(path), to }]);
};

export const createExplorerPath = async (
    parentPath: string,
    name: string,
    type: "folder" | "file",
): Promise<string | null> => {
    await recordProjectSnapshot();
    const folder = normalizePath(parentPath);
    const path = folder ? `${folder}/${name}` : name;
    if (type === "folder") {
        await vfs.writeFile(
            `${path}/${DIR_MARKER_FILENAME}`,
            createEmptyCartridge(),
        );
        return null;
    }

    await (vfs.writeFile as any)(path, resolveNewFileContent(path));
    await registerBlueprintInActiveManifest(path);
    return path;
};

