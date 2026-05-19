import type {
    ProjectManifest,
    ProjectVersionChangeKind,
} from "./projectManifest";
import { readProjectManifest } from "./projectManifest";
import { applyProjectVersionStage } from "./projectVersionStage";
import { clearStagedProjectVersion } from "./projectVersionTracker";

const normalize = (path: string) =>
    path.replaceAll("\\", "/").replace(/^\/+/, "");

const resolveProjectRoot = (manifestPath: string) =>
    manifestPath.replace(/\/?manifest\.json$/, "");

export const isManifestListedProjectFile = (
    manifestPath: string,
    manifest: ProjectManifest,
    targetPath: string,
) => {
    const root = resolveProjectRoot(manifestPath);
    const target = normalize(targetPath);
    return manifest.files.some(
        (file) => normalize(`${root}/${file}`) === target,
    );
};

export const stageProjectVersionInVfs = async (
    vfs: unknown,
    manifestPath: string,
    changeKind: ProjectVersionChangeKind,
) => {
    const manifest = await readProjectManifest(vfs, manifestPath);
    const applied = applyProjectVersionStage(
        manifestPath,
        manifest,
        changeKind,
    );
    if (applied.versionChanged) {
        await (vfs as any).writeFile(manifestPath, applied.manifest as never);
    }
    return applied;
};

export const persistAndClearProjectVersion = async (
    vfs: unknown,
    manifestPath: string,
) => {
    await (vfs as any).saveToDisk(manifestPath);
    clearStagedProjectVersion(manifestPath);
};
