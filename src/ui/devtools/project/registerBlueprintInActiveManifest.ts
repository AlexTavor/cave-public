import { workspaceService } from "../../../engine/terminal/commands/projectServices";
import { vfs } from "../../../engine/vfs/FileSystem";
import { readProjectManifest } from "../../../engine/workspace/projectManifest";
import { applyProjectVersionStage } from "../../../engine/workspace/projectVersionStage";
import { normalizePath } from "./projectUtils";

const resolveRelativeProjectPath = (
    manifestPath: string,
    targetPath: string,
) => {
    const root = normalizePath(manifestPath).replace(/\/manifest\.json$/, "");
    const normalizedTarget = normalizePath(targetPath);
    if (!root) return normalizedTarget;
    if (!normalizedTarget.startsWith(`${root}/`)) return null;
    return normalizedTarget.slice(root.length + 1);
};

export const registerBlueprintInActiveManifest = async (path: string) => {
    if (!path.toLowerCase().endsWith(".bp")) return false;
    const manifestPath = workspaceService.getManifestPath();
    if (!manifestPath) return false;

    const relativePath = resolveRelativeProjectPath(manifestPath, path);
    if (!relativePath) return false;

    const manifest = await readProjectManifest(vfs, manifestPath);
    if (manifest.files.some((file) => normalizePath(file) === relativePath)) {
        return false;
    }

    const applied = applyProjectVersionStage(
        manifestPath,
        { ...manifest, files: [...manifest.files, relativePath] },
        "patch",
    );
    await vfs.writeFile(manifestPath, applied.manifest as never);
    await workspaceService.loadProject(manifestPath);
    return true;
};
