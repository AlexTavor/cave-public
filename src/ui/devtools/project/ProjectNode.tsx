import React from "react";
import type { TreeNode } from "../../../engine/vfs/types";
import { DIR_MARKER_FILENAME } from "./projectUtils";
import { Card } from "../../lib/atoms/card";

interface ProjectNodeProps {
    node: TreeNode;
    depth: number;
    selection: Set<string>;
    expanded: Set<string>;
    onSelect: (path: string, event: React.MouseEvent) => void;
    onToggle: (path: string) => void;
    onOpenFile: (path: string) => void;
    onContext: (path: string, event: React.MouseEvent) => void;
    onDropTo: (targetPath: string, event: React.DragEvent) => void;
}

export const ProjectNode: React.FC<ProjectNodeProps> = (props) => {
    const { node, depth, selection, expanded } = props;
    if (node.name === DIR_MARKER_FILENAME) return null;
    const isOpen = expanded.has(node.path);
    const isSelected = selection.has(node.path);

    return (
        <>
            <Card
                variant={isSelected ? "highlight" : "transparent"}
                padding="xs"
            >
                <div
                    role="treeitem"
                    tabIndex={0}
                    aria-selected={isSelected}
                    draggable={Boolean(node.path)}
                    onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", node.path)
                    }
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => props.onDropTo(node.path, e)}
                    onClick={(e) => props.onSelect(node.path, e)}
                    onKeyDown={() => undefined}
                    onContextMenu={(e) => props.onContext(node.path, e)}
                    onDoubleClick={() =>
                        node.type === "file" && props.onOpenFile(node.path)
                    }
                    style={{
                        paddingLeft: depth * 12,
                        fontWeight: isSelected ? 700 : 400,
                    }}
                >
                    {node.type === "directory" && (
                        <button
                            type="button"
                            onClick={() => props.onToggle(node.path)}
                        >
                            {isOpen ? "▾" : "▸"}
                        </button>
                    )}
                    {isSelected ? "• " : ""}
                    {node.name || "src/data/raw"}
                </div>
            </Card>

            {node.type === "directory" &&
                isOpen &&
                (node.children ?? []).map((child) => (
                    <ProjectNode
                        key={child.path}
                        node={child}
                        depth={depth + 1}
                        selection={selection}
                        expanded={expanded}
                        onSelect={props.onSelect}
                        onToggle={props.onToggle}
                        onOpenFile={props.onOpenFile}
                        onContext={props.onContext}
                        onDropTo={props.onDropTo}
                    />
                ))}
        </>
    );
};
