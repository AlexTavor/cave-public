import React from "react";
import { ToolFrame } from "../../../../lib/atoms/tool-frame";
import { useScrollMemory } from "../../../hooks/useScrollMemory";
import { BlueprintGrid } from "./BlueprintGrid";
import { BlueprintList } from "./BlueprintList";
import { ListPanelToolbar } from "./ListPanelToolbar";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { useExplorerListPanel } from "./hooks/useExplorerListPanel";
import { useExplorerStore } from "./state/explorerStore";

interface BlueprintListPanelProps {
    filename: string;
}

export const BlueprintListPanel: React.FC<BlueprintListPanelProps> = ({
    filename,
}) => {
    const sessionId = `list::${filename}::blueprints`;
    const scrollRef = useScrollMemory(sessionId);
    const viewState = useExplorerListPanel({ filename, sessionId });
    const session = useExplorerStore((s) => s.sessions[sessionId]);

    if (viewState.isLoading) return <div>Loading...</div>;
    if (viewState.hasError) return <div>Error loading module.</div>;

    const showGrid = (session?.viewMode ?? "grid") === "grid";

    return (
        <ToolFrame
            title={`Blueprints — ${viewState.title} (v${viewState.version})`}
            toolbarActions={
                <ListPanelToolbar sessionId={sessionId} showViewToggle />
            }
            bodyRef={scrollRef}
        >
            {showGrid ? (
                <BlueprintGrid filename={filename} sessionId={sessionId} />
            ) : (
                <BlueprintList filename={filename} sessionId={sessionId} />
            )}

            <DeleteConfirmModal filename={filename} sessionId={sessionId} />
        </ToolFrame>
    );
};
