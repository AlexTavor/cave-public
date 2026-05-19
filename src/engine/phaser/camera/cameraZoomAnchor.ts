import type Phaser from "phaser";

export const zoomAroundScreenPoint = (
    cam: Phaser.Cameras.Scene2D.Camera,
    nextZoom: number,
    screenX: number,
    screenY: number,
): void => {
    const viewX = screenX - (cam.x ?? 0);
    const viewY = screenY - (cam.y ?? 0);
    const worldX = cam.scrollX + viewX / cam.zoom;
    const worldY = cam.scrollY + viewY / cam.zoom;
    cam.setZoom(nextZoom);
    cam.scrollX = worldX - viewX / nextZoom;
    cam.scrollY = worldY - viewY / nextZoom;
};
