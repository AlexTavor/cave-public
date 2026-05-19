import {
    bumpProjectVersion,
    type ProjectVersionChangeKind,
} from "./projectManifestVersion";

export interface StagedProjectVersion {
    baseVersion: string;
    pendingChange: ProjectVersionChangeKind;
    effectiveVersion: string;
}

const stagedVersions = new Map<string, StagedProjectVersion>();

const mergeChangeKind = (
    current: ProjectVersionChangeKind,
    next: ProjectVersionChangeKind,
): ProjectVersionChangeKind =>
    current === "minor" || next === "minor" ? "minor" : "patch";

export const stageProjectVersion = (
    manifestPath: string,
    currentManifestVersion: string,
    changeKind: ProjectVersionChangeKind,
) => {
    const staged = stagedVersions.get(manifestPath);
    if (!staged) {
        const effectiveVersion = bumpProjectVersion(
            currentManifestVersion,
            changeKind,
        );
        const created: StagedProjectVersion = {
            baseVersion: currentManifestVersion,
            pendingChange: changeKind,
            effectiveVersion,
        };
        stagedVersions.set(manifestPath, created);
        return { ...created, versionChanged: true };
    }
    const pendingChange = mergeChangeKind(staged.pendingChange, changeKind);
    if (pendingChange === staged.pendingChange) {
        return { ...staged, versionChanged: false };
    }
    const next: StagedProjectVersion = {
        ...staged,
        pendingChange,
        effectiveVersion: bumpProjectVersion(staged.baseVersion, pendingChange),
    };
    stagedVersions.set(manifestPath, next);
    return { ...next, versionChanged: true };
};

export const getStagedProjectVersion = (manifestPath: string) =>
    stagedVersions.get(manifestPath) ?? null;

export const clearStagedProjectVersion = (manifestPath: string) => {
    stagedVersions.delete(manifestPath);
};
