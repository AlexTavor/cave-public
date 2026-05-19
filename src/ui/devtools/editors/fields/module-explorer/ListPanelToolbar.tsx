import React from "react";
import { Button } from "../../../../lib/atoms/button";
import { ToolbarInput } from "./ModuleExplorer.styles";
import { ToolbarGroup, ToolbarRoot } from "./ListPanelToolbar.styles";
import { useExplorerStore } from "./state/explorerStore";

interface ListPanelToolbarProps {
    sessionId: string;
    showViewToggle?: boolean;
}

export const ListPanelToolbar: React.FC<ListPanelToolbarProps> = ({
    sessionId,
    showViewToggle = false,
}) => {
    const session = useExplorerStore((s) => s.sessions[sessionId]);
    const { setFilter, setViewMode } = useExplorerStore((s) => s.actions);

    if (!session) return null;

    const { filter, viewMode } = session;

    return (
        <ToolbarRoot>
            <ToolbarGroup>
                <ToolbarInput
                    placeholder="Search…"
                    value={filter}
                    onChange={(e) => setFilter(sessionId, e.target.value)}
                />
            </ToolbarGroup>
            {showViewToggle ? (
                <ToolbarGroup>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                            setViewMode(
                                sessionId,
                                viewMode === "grid" ? "list" : "grid",
                            )
                        }
                    >
                        {viewMode === "grid" ? "List" : "Grid"}
                    </Button>
                </ToolbarGroup>
            ) : null}
        </ToolbarRoot>
    );
};
