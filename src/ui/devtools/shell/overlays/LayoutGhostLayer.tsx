import React from "react";
import { useLayoutGhost } from "./useLayoutGhost";
import {
    CrosshairHorizontal,
    CrosshairVertical,
    GhostContainer,
    GhostNode,
} from "./LayoutGhostLayer.styles";

export interface LayoutGhostLayerProps {}

export const LayoutGhostLayer: React.FC<LayoutGhostLayerProps> = () => {
    const { x, y, radius, visible } = useLayoutGhost();

    if (!visible) return null;

    const nodeSize = radius * 2;

    return (
        <GhostContainer data-testid="layout-ghost-layer">
            <CrosshairVertical
                data-testid="layout-ghost-crosshair-x"
                style={{ left: `${x}%`, transform: "translateX(-50%)" }}
            />
            <CrosshairHorizontal
                data-testid="layout-ghost-crosshair-y"
                style={{ top: `${y}%`, transform: "translateY(-50%)" }}
            />
            <GhostNode
                data-testid="layout-ghost-node"
                style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: nodeSize,
                    height: nodeSize,
                    transform: "translate(-50%, -50%)",
                }}
            />
        </GhostContainer>
    );
};
