import React, { useCallback } from "react";
import { ProjectExplorer } from "../../project/ProjectExplorer";
import { useLayoutStore } from "../../state/useLayoutStore";
import { useShellStore } from "../shell";
import { openFileTab } from "./openFileTab";
import { isManifestPath, loadProjectFromManifest } from "../loadProject";

export const ProjectHome: React.FC = () => {
    const openTab = useLayoutStore((s) => s.openTab);
    const openFile = useShellStore((s) => s.openFile);

    const onOpenFile = useCallback(
        (path: string) => {
            if (isManifestPath(path)) {
                void loadProjectFromManifest(path);
                return;
            }
            openFileTab(openTab, path);
            openFile(path);
        },
        [openTab, openFile],
    );

    return <ProjectExplorer onOpenFile={onOpenFile} />;
};
