import type {
    CameraConfig,
    WorldConfig,
} from "../../../data/schemas/game/cameraWorldConfig";

export interface CameraViewport {
    width: number;
    height: number;
}

export interface CameraSnapshot {
    centerX: number;
    centerY: number;
    zoom: number;
}

/** Compute the world-space view dimensions at a given zoom. */
export const viewSize = (
    viewport: CameraViewport,
    zoom: number,
): { w: number; h: number } => ({
    w: viewport.width / zoom,
    h: viewport.height / zoom,
});

/** Check whether a zoom level keeps the view inside world bounds. */
export const isZoomValid = (
    viewport: CameraViewport,
    zoom: number,
    world: WorldConfig,
): boolean => {
    const { w, h } = viewSize(viewport, zoom);
    return w <= world.width && h <= world.height;
};

export const minCompatibleZoom = (
    viewport: CameraViewport,
    world: WorldConfig,
): number =>
    Math.max(viewport.width / world.width, viewport.height / world.height);

/**
 * Evaluate a zoom request per §7.4:
 * Returns the resulting zoom, or null if rejected.
 */
export const evaluateZoom = (
    proposed: number,
    camera: CameraConfig,
    viewport: CameraViewport,
    world: WorldConfig,
): number | null => {
    const lowerBound = Math.max(
        camera.zoom.min,
        minCompatibleZoom(viewport, world),
    );
    if (lowerBound > camera.zoom.max) return null;
    return Math.min(Math.max(proposed, lowerBound), camera.zoom.max);
};

/**
 * Clamp camera center so that the view rectangle stays inside world bounds.
 */
export const clampCenter = (
    centerX: number,
    centerY: number,
    viewport: CameraViewport,
    zoom: number,
    world: WorldConfig,
): { x: number; y: number } => {
    const { w, h } = viewSize(viewport, zoom);
    const halfW = w / 2;
    const halfH = h / 2;
    const x = Math.min(Math.max(centerX, halfW), world.width - halfW);
    const y = Math.min(Math.max(centerY, halfH), world.height - halfH);
    return { x, y };
};

/** Classify pointer travel as click vs drag. */
export const isClick = (travel: number, threshold: number): boolean =>
    travel < threshold;

