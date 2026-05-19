import { isSemverNewer } from "../engine/vfs/version";
import {
    parseProjectManifest,
    type ProjectManifest,
} from "../engine/workspace/projectManifest";
import { resolveManifestPathFromPaths } from "./resolveWorkspaceManifestPath";

export interface BootstrapManifestInfo {
    path: string;
    manifest: ProjectManifest;
}

export const readBootstrapSnapshotManifest = (
    snapshot: Record<string, unknown>,
): BootstrapManifestInfo | null => {
    const path = resolveManifestPathFromPaths(Object.keys(snapshot));
    return path
        ? { path, manifest: parseProjectManifest(snapshot[path], path) }
        : null;
};

export const shouldImportBootstrapSnapshot = (
    currentManifest: ProjectManifest | null,
    snapshotManifest: ProjectManifest | null,
) =>
    Boolean(
        snapshotManifest &&
        (!currentManifest ||
            isSemverNewer(snapshotManifest.version, currentManifest.version)),
    );
