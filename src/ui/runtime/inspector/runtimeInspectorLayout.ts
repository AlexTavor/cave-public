import type { RuntimeInspectorBounds } from "./runtimeInspectorTypes";

export const INSPECTOR_DEFAULT_WIDTH = 420;
export const INSPECTOR_DEFAULT_HEIGHT = 520;
export const INSPECTOR_MIN_WIDTH = 280;
export const INSPECTOR_MIN_HEIGHT = 180;
export const INSPECTOR_VIEWPORT_MARGIN = 16;
export const INSPECTOR_CASCADE_OFFSET = 28;

const clamp = (value: number, min: number, max: number): number =>
    Math.min(Math.max(value, min), max);

const clampSize = (size: number, min: number, limit: number): number =>
    clamp(size, Math.min(min, limit), limit);

export const createDefaultInspectorBounds = (
    existingWindowCount: number,
    viewportWidth: number,
    viewportHeight: number,
): RuntimeInspectorBounds => {
    const width = clampSize(
        INSPECTOR_DEFAULT_WIDTH,
        INSPECTOR_MIN_WIDTH,
        Math.max(1, viewportWidth - INSPECTOR_VIEWPORT_MARGIN * 2),
    );
    const height = clampSize(
        INSPECTOR_DEFAULT_HEIGHT,
        INSPECTOR_MIN_HEIGHT,
        Math.max(1, viewportHeight - INSPECTOR_VIEWPORT_MARGIN * 2),
    );
    const offset = existingWindowCount * INSPECTOR_CASCADE_OFFSET;
    return clampInspectorMove(
        {
            x: INSPECTOR_VIEWPORT_MARGIN + offset,
            y: INSPECTOR_VIEWPORT_MARGIN + offset,
            width,
            height,
        },
        viewportWidth,
        viewportHeight,
    );
};

export const clampInspectorMove = (
    bounds: RuntimeInspectorBounds,
    viewportWidth: number,
    viewportHeight: number,
): RuntimeInspectorBounds => ({
    ...bounds,
    x: clamp(
        bounds.x,
        INSPECTOR_VIEWPORT_MARGIN,
        viewportWidth - INSPECTOR_VIEWPORT_MARGIN - bounds.width,
    ),
    y: clamp(
        bounds.y,
        INSPECTOR_VIEWPORT_MARGIN,
        viewportHeight - INSPECTOR_VIEWPORT_MARGIN - bounds.height,
    ),
});

export const clampInspectorResize = (
    bounds: RuntimeInspectorBounds,
    viewportWidth: number,
    viewportHeight: number,
): RuntimeInspectorBounds => ({
    ...bounds,
    width: clampSize(
        bounds.width,
        INSPECTOR_MIN_WIDTH,
        viewportWidth - INSPECTOR_VIEWPORT_MARGIN - bounds.x,
    ),
    height: clampSize(
        bounds.height,
        INSPECTOR_MIN_HEIGHT,
        viewportHeight - INSPECTOR_VIEWPORT_MARGIN - bounds.y,
    ),
});
