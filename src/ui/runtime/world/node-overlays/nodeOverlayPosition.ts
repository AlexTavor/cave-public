import type { SerializedCameraState } from "../../../../engine/runtime/persistence/types";
import type { NodeOverlayDisplayBounds } from "../../../../engine/phaser/display/node-overlay/nodeOverlayDisplayBounds";
import type { ScreenPosition } from "./nodeOverlayTypes";

const CARD_GAP_PX = 0;

export const snapScreenCoordinate = (value: number) => Math.round(value);

export const projectNodeOverlayWorldPoint = (input: {
    cameraState: SerializedCameraState | null;
    viewportWidth: number;
    viewportHeight: number;
    worldX: number;
    worldY: number;
}): ScreenPosition | null => {
    const { cameraState, viewportWidth, viewportHeight, worldX, worldY } =
        input;
    if (!cameraState || viewportWidth <= 0 || viewportHeight <= 0) return null;
    return {
        x: snapScreenCoordinate(
            viewportWidth / 2 +
                (worldX - cameraState.centerX) * cameraState.zoom,
        ),
        y: snapScreenCoordinate(
            viewportHeight / 2 +
                (worldY - cameraState.centerY) * cameraState.zoom,
        ),
    };
};

const resolveEdgePosition = (
    edgeY: number,
    gapDirection: 1 | -1,
    input: {
        cameraState: SerializedCameraState | null;
        viewportWidth: number;
        viewportHeight: number;
        bounds: NodeOverlayDisplayBounds;
    },
): ScreenPosition | null => {
    const projected = projectNodeOverlayWorldPoint({
        cameraState: input.cameraState,
        viewportWidth: input.viewportWidth,
        viewportHeight: input.viewportHeight,
        worldX: input.bounds.centerX,
        worldY: edgeY,
    });
    return projected
        ? { x: projected.x, y: projected.y + CARD_GAP_PX * gapDirection }
        : null;
};

export const resolveTopNodeOverlayPosition = (input: {
    cameraState: SerializedCameraState | null;
    viewportWidth: number;
    viewportHeight: number;
    bounds: NodeOverlayDisplayBounds;
}): ScreenPosition | null => resolveEdgePosition(input.bounds.topY, -1, input);

export const resolveBottomNodeOverlayPosition = (input: {
    cameraState: SerializedCameraState | null;
    viewportWidth: number;
    viewportHeight: number;
    bounds: NodeOverlayDisplayBounds;
}): ScreenPosition | null =>
    resolveEdgePosition(input.bounds.bottomY, 1, input);

export const resolveNodeOverlayPosition = (input: {
    cameraState: SerializedCameraState | null;
    viewportWidth: number;
    viewportHeight: number;
    worldX: number;
    worldY: number;
    radius: number;
}): ScreenPosition | null =>
    resolveTopNodeOverlayPosition({
        cameraState: input.cameraState,
        viewportWidth: input.viewportWidth,
        viewportHeight: input.viewportHeight,
        bounds: {
            entityId: "compat",
            centerX: input.worldX,
            topY: input.worldY - input.radius,
            bottomY: input.worldY + input.radius,
        },
    });
