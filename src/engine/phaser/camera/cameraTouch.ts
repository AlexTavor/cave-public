import type Phaser from "phaser";
import type {
    CameraConfig,
    WorldConfig,
} from "../../../data/schemas/game/cameraWorldConfig";
import { evaluateZoom } from "./cameraControllerMath";
import { clampAndApply } from "./cameraInputHandlers";
import { zoomAroundScreenPoint } from "./cameraZoomAnchor";

export interface PinchState {
    startDistance: number;
    startZoom: number;
}

const measureDistance = (
    first: Phaser.Input.Pointer,
    second: Phaser.Input.Pointer,
) => Math.hypot(second.x - first.x, second.y - first.y);

const midpoint = (
    first: Phaser.Input.Pointer,
    second: Phaser.Input.Pointer,
) => ({
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
});

export const isPrimaryCameraPointer = (pointer: Phaser.Input.Pointer) =>
    Reflect.get(pointer as object, "pointerType") !== "mouse" ||
    pointer.button === 0;

export const canStartPinch = (
    input: Phaser.Input.InputPlugin,
    isPointerOverObject: (pointer: Phaser.Input.Pointer) => boolean,
) =>
    Boolean(
        input.pointer1?.isDown &&
        input.pointer2?.isDown &&
        !isPointerOverObject(input.pointer1) &&
        !isPointerOverObject(input.pointer2),
    );

export const beginPinch = (
    cam: Phaser.Cameras.Scene2D.Camera,
    first: Phaser.Input.Pointer,
    second: Phaser.Input.Pointer,
): PinchState => ({
    startDistance: Math.max(measureDistance(first, second), 1),
    startZoom: cam.zoom,
});

export const updatePinch = (
    state: PinchState,
    cam: Phaser.Cameras.Scene2D.Camera,
    first: Phaser.Input.Pointer,
    second: Phaser.Input.Pointer,
    config: CameraConfig,
    world: WorldConfig,
): boolean => {
    const distance = Math.max(measureDistance(first, second), 1);
    const nextZoom = evaluateZoom(
        state.startZoom * (distance / state.startDistance),
        config,
        { width: cam.width, height: cam.height },
        world,
    );
    if (nextZoom === null || nextZoom === cam.zoom) return false;
    const center = midpoint(first, second);
    zoomAroundScreenPoint(cam, nextZoom, center.x, center.y);
    clampAndApply(cam, world);
    return true;
};
