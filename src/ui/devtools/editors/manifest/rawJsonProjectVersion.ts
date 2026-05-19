import { workspaceService } from "../../../../engine/terminal/commands/projectServices";
import { vfs } from "../../../../engine/vfs/FileSystem";
import {
    classifyManifestChange,
    parseProjectManifest,
    readProjectManifest,
} from "../../../../engine/workspace/projectManifest";
import { applyProjectVersionStage } from "../../../../engine/workspace/projectVersionStage";
import { isManifestListedProjectFile } from "../../../../engine/workspace/projectVersionPersistence";

export const applyRawJsonProjectVersion = async (
    targetPath: string,
    previousDocument: unknown,
    nextPayload: unknown,
) => {
    const manifestPath = workspaceService.getManifestPath();
    if (!manifestPath) return nextPayload;
    if (targetPath === manifestPath) {
        const previous = parseProjectManifest(previousDocument, manifestPath);
        const next = parseProjectManifest(nextPayload, manifestPath);
        const changeKind = classifyManifestChange(previous, next);
        return changeKind
            ? applyProjectVersionStage(
                  manifestPath,
                  { ...next, version: previous.version },
                  changeKind,
              ).manifest
            : next;
    }
    const manifest = await readProjectManifest(vfs, manifestPath);
    if (!isManifestListedProjectFile(manifestPath, manifest, targetPath)) {
        return nextPayload;
    }
    const applied = applyProjectVersionStage(manifestPath, manifest, "patch");
    if (applied.versionChanged) {
        await vfs.writeFile(manifestPath, applied.manifest as never);
    }
    return nextPayload;
};
