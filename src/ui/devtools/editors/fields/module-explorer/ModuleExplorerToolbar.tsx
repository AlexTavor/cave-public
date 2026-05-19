import React from "react";
import { Button } from "../../../../lib/atoms/button";
import { ToolbarInput } from "./ModuleExplorer.styles";
import { useExplorerStore } from "./state/explorerStore";
import { useShellStore } from "../../../shell/shell";

interface ModuleExplorerToolbarProps {
    filename: string;
}

export const ModuleExplorerToolbar: React.FC<ModuleExplorerToolbarProps> = ({
    filename,
}) => {
    const sessionId = `list::${filename}::blueprints`;
    const session = useExplorerStore((s) => s.sessions[sessionId]);
    const { setViewMode, setFilter } = useExplorerStore((s) => s.actions);
    const closeFile = useShellStore((s) => s.closeFile);

    if (!session) return null;

    const { viewMode, filter } = session;

    return (
        <>
            <ToolbarInput
                placeholder="Search…"
                value={filter}
                onChange={(e) => setFilter(sessionId, e.target.value)}
            />
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
            <Button
                size="sm"
                variant="ghost"
                onClick={() => closeFile(filename)}
            >
                Close Module
            </Button>
        </>
    );
};
