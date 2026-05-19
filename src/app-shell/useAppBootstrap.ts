import { useEffect, useState } from "react";
import { vfs } from "../engine/vfs/FileSystem";
import { refreshFileCache } from "../engine/terminal/fileUtils";
import { loadBootstrapSnapshotFromPublicAsset } from "../engine/vfs/bootstrap";
import { readProjectManifest } from "../engine/workspace/projectManifest";
import {
    readBootstrapSnapshotManifest,
    shouldImportBootstrapSnapshot,
} from "./bootstrapManifestSelection";
import { resolveWorkspaceManifestPath } from "./resolveWorkspaceManifestPath";

export interface AppBootstrapState {
    isBootstrapping: boolean;
    bootstrapError: string | null;
    hasWorkspaceManifest: boolean;
    workspaceManifestPath: string | null;
}

const INITIAL_STATE: AppBootstrapState = {
    isBootstrapping: true,
    bootstrapError: null,
    hasWorkspaceManifest: false,
    workspaceManifestPath: null,
};

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    try {
        return JSON.stringify(error);
    } catch {
        return "Unknown bootstrap error.";
    }
};

export const useAppBootstrap = (): AppBootstrapState => {
    const [state, setState] = useState(INITIAL_STATE);

    useEffect(() => {
        let active = true;
        const update = (next: Partial<AppBootstrapState>) => {
            if (!active) return;
            setState((current) => ({ ...current, ...next }));
        };

        void (async () => {
            try {
                await vfs.init();
                const currentPath = await resolveWorkspaceManifestPath();
                const currentManifest = currentPath
                    ? await readProjectManifest(vfs, currentPath)
                    : null;
                let manifestPath = currentPath;
                let bootstrapError: string | null = null;
                let snapshot: Record<string, unknown> | null = null;
                try {
                    snapshot = await loadBootstrapSnapshotFromPublicAsset();
                } catch (error) {
                    if (!currentPath) throw error;
                }
                if (snapshot) {
                    try {
                        const snapshotManifest =
                            readBootstrapSnapshotManifest(snapshot);
                        if (
                            shouldImportBootstrapSnapshot(
                                currentManifest,
                                snapshotManifest?.manifest ?? null,
                            )
                        ) {
                            await vfs.importState(snapshot);
                            refreshFileCache();
                            manifestPath = await resolveWorkspaceManifestPath();
                        }
                    } catch (error) {
                        if (!currentPath) throw error;
                        bootstrapError = getErrorMessage(error);
                    }
                }
                if (manifestPath === null) {
                    const error = new Error(
                        "Bootstrap import completed without any manifest.json.",
                    );
                    console.error(error);
                    update({ bootstrapError: error.message });
                    return;
                }
                update({
                    hasWorkspaceManifest: true,
                    bootstrapError,
                    workspaceManifestPath: manifestPath,
                });
            } catch (error) {
                console.error(error);
                update({ bootstrapError: getErrorMessage(error) });
            } finally {
                update({ isBootstrapping: false });
            }
        })();

        return () => {
            active = false;
        };
    }, []);

    return state;
};
