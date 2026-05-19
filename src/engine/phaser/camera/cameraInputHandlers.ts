import type Phaser from "phaser";
import type {
    CameraConfig,
    WorldConfig,
} from "../../../data/schemas/game/cameraWorldConfig";
import { evaluateZoom, isClick } from "./cameraControllerMath";
import type { SerializedCameraState } from "../../runtime/persistence/types";
import { zoomAroundScreenPoint } from "./cameraZoomAnchor";
export { applyRestore } from "./cameraRestore";

export interface DragState {
    startX: number;
    startY: number;
    cameraStartX: number;
    cameraStartY: number;
    startedOnObject: boolean;
}

const camCenter = (cam: Phaser.Cameras.Scene2D.Camera) => ({
    x: cam.scrollX + cam.width / (2 * cam.zoom),
    y: cam.scrollY + cam.height / (2 * cam.zoom),
});

export const handleWheel = (
    cam: Phaser.Cameras.Scene2D.Camera,
    screenX: number,
    screenY: number,
    deltaY: number,
    config: CameraConfig,
    world: WorldConfig,
    publishFn: () => void,
): void => {
    const step =
        deltaY > 0 ? -config.zoom.scrollFactor : config.zoom.scrollFactor;
    const result = evaluateZoom(cam.zoom + step, config, cam, world);
    if (result === null) return;
    zoomAroundScreenPoint(cam, result, screenX, screenY);
    clampAndApply(cam, world);
    publishFn();
};

export const beginDrag = (
    pointer: Phaser.Input.Pointer,
    cam: Phaser.Cameras.Scene2D.Camera,
    startedOnObject: boolean,
): DragState => ({
    startX: pointer.x,
    startY: pointer.y,
    cameraStartX: cam.scrollX,
    cameraStartY: cam.scrollY,
    startedOnObject,
});

export const updateDrag = (
    pointer: Phaser.Input.Pointer,
    drag: DragState,
    cam: Phaser.Cameras.Scene2D.Camera,
    vel: { x: number; y: number },
): void => {
    const dx = (pointer.x - drag.startX) / cam.zoom;
    const dy = (pointer.y - drag.startY) / cam.zoom;
    const prevX = cam.scrollX;
    const prevY = cam.scrollY;
    cam.scrollX = drag.cameraStartX - dx;
    cam.scrollY = drag.cameraStartY - dy;
    vel.x = cam.scrollX - prevX;
    vel.y = cam.scrollY - prevY;
};

export const endDrag = (
    drag: DragState,
    pointer: Phaser.Input.Pointer,
    config: CameraConfig,
    selectEntity: (id: string | null) => void,
): void => {
    if (drag.startedOnObject) return;
    const travel = Math.hypot(pointer.x - drag.startX, pointer.y - drag.startY);
    if (isClick(travel, config.pan.dragThreshold)) selectEntity(null);
};

export const clampAndApply = (
    cam: Phaser.Cameras.Scene2D.Camera,
    world: WorldConfig,
): void => {
    const vw = cam.width / cam.zoom;
    const vh = cam.height / cam.zoom;
    const maxX = Math.max(0, world.width - vw);
    const maxY = Math.max(0, world.height - vh);
    cam.scrollX = Math.min(Math.max(cam.scrollX, 0), maxX);
    cam.scrollY = Math.min(Math.max(cam.scrollY, 0), maxY);
};

export const publishCameraState = (
    cam: Phaser.Cameras.Scene2D.Camera,
    setCameraState: (state: SerializedCameraState) => void,
): void => {
    const c = camCenter(cam);
    setCameraState({ centerX: c.x, centerY: c.y, zoom: cam.zoom });
};

