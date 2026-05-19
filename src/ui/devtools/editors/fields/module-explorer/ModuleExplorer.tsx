import React from "react";
import { useScrollMemory } from "../../../hooks/useScrollMemory";
import { ModuleExplorerProps } from "./types";
import { useModuleExplorer } from "./hooks/useModuleExplorer";
import { ModuleExplorerView } from "./ModuleExplorerView";

export const ModuleExplorer: React.FC<ModuleExplorerProps> = ({ filename }) => {
    const scrollRef = useScrollMemory(`module::${filename}`);
    const viewState = useModuleExplorer({ filename });

    if (viewState.isLoading) return <div>Loading...</div>;
    if (viewState.hasError) return <div>Error loading module.</div>;

    return (
        <ModuleExplorerView
            title={viewState.title}
            version={viewState.version}
            onOpenSettings={viewState.openSettings}
            onOpenPhysics={viewState.openPhysics}
            onOpenBlueprints={viewState.openBlueprints}
            onOpenDisplays={viewState.openDisplays}
            onOpenDraftOptions={viewState.openDraftOptions}
            onOpenDraftPools={viewState.openDraftPools}
            bodyRef={scrollRef}
        />
    );
};

