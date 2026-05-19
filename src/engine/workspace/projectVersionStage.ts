import type { ProjectManifest } from "./projectManifest";
import {
    stageProjectVersion,
    type StagedProjectVersion,
} from "./projectVersionTracker";
import type { ProjectVersionChangeKind } from "./projectManifestVersion";

export interface AppliedProjectVersionStage {
    manifest: ProjectManifest;
    staged: StagedProjectVersion;
    versionChanged: boolean;
}

export const applyProjectVersionStage = (
    manifestPath: string,
    manifest: ProjectManifest,
    changeKind: ProjectVersionChangeKind,
): AppliedProjectVersionStage => {
    const staged = stageProjectVersion(
        manifestPath,
        manifest.version,
        changeKind,
    );
    return {
        manifest: staged.versionChanged
            ? { ...manifest, version: staged.effectiveVersion }
            : manifest,
        staged,
        versionChanged: staged.versionChanged,
    };
};
