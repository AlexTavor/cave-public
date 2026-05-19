import { useEffect, useRef } from "react";
import { useShellStore } from "../shell";
import { loadProjectFromManifest } from "../loadProject";

/**
 * On mount, if a manifest path was persisted in the shell store,
 * silently reload the project so the workspace is restored after
 * a page refresh.
 */
export const useRestoreProject = () => {
    const manifestPath = useShellStore((s) => s.activeManifestPath);
    const attempted = useRef(false);

    useEffect(() => {
        if (!manifestPath || attempted.current) return;
        attempted.current = true;
        void loadProjectFromManifest(manifestPath);
    }, [manifestPath]);
};
