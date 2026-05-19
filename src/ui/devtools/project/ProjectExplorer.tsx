import React from "react";
import { ExplorerContextMenu } from "./ExplorerContextMenu";
import { ProjectNode } from "./ProjectNode";
import { useProjectExplorer } from "./useProjectExplorer";
import { useProjectExplorerActions } from "./useProjectExplorerActions";
import { ExplorerRoot } from "./ProjectExplorer.styles";

interface ProjectExplorerProps {
    className?: string;
    onOpenFile: (path: string) => void;
}

export const ProjectExplorer: React.FC<ProjectExplorerProps> = ({
    className,
    onOpenFile,
}) => {
    const explorer = useProjectExplorer();
    const actions = useProjectExplorerActions(explorer, onOpenFile);
    const menu = actions.menu;

    const targetNode = menu
        ? explorer.tree.children?.find((n) => n.path === menu.path)
        : null;

    return (
        <ExplorerRoot className={className} id="project-explorer">
            <ProjectNode
                node={explorer.tree}
                depth={0}
                selection={explorer.selection}
                expanded={explorer.expanded}
                onSelect={actions.handleSelect}
                onToggle={explorer.handleToggleFolder}
                onOpenFile={onOpenFile}
                onDropTo={actions.handleDropTo}
                onContext={actions.handleContextMenu}
            />
            {menu && (
                <ExplorerContextMenu
                    x={menu.x}
                    y={menu.y}
                    isMulti={actions.selectedPaths.length > 1}
                    isFolderTarget={targetNode?.type !== "file"}
                    onClose={actions.handleCloseMenu}
                    onRename={actions.handleRename}
                    onDelete={actions.handleDelete}
                    onDuplicate={actions.handleCloseMenu}
                    onNewFile={actions.handleNewFile}
                    onNewFolder={actions.handleNewFolder}
                />
            )}
        </ExplorerRoot>
    );
};

