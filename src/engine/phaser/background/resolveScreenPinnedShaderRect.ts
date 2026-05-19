export const resolveScreenPinnedShaderRect = (
    viewportWidth: number,
    viewportHeight: number,
    cameraZoom: number,
) => {
    const safeZoom = Math.max(cameraZoom, 0.0001);
    return {
        x: viewportWidth / (2 * safeZoom),
        y: viewportHeight / (2 * safeZoom),
        width: viewportWidth / safeZoom,
        height: viewportHeight / safeZoom,
    };
};
