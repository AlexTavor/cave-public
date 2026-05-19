import type Phaser from "phaser";
import type {
    CameraConfig,
    WorldConfig,
} from "../../../data/schemas/game/cameraWorldConfig";
import type { SerializedCameraState } from "../../runtime/persistence/types";
import { evaluateZoom } from "./cameraControllerMath";
import { cameraStatesEquivalent } from "./cameraStateComparison";

const readCameraState = (cam: Phaser.Cameras.Scene2D.Camera) => ({
    centerX: cam.scrollX + cam.width / (2 * cam.zoom),
    centerY: cam.scrollY + cam.height / (2 * cam.zoom),
    zoom: cam.zoom,
});

const matchesCameraState = (
    cam: Phaser.Cameras.Scene2D.Camera,
    snapshot: SerializedCameraState,
) => cameraStatesEquivalent(readCameraState(cam), snapshot);

export const applyRestore = (
    cam: Phaser.Cameras.Scene2D.Camera,
    snapshot: SerializedCameraState,
    config: CameraConfig,
    world: WorldConfig,
): boolean => {
    const zoom = evaluateZoom(
        snapshot.zoom,
        config,
        {
            width: cam.width,
            height: cam.height,
        },
        world,
    );
    if (zoom === null) {
        console.error(
            "CameraController: saved camera incompatible, using defaults",
        );
        return false;
    }
    cam.setZoom(zoom);
    cam.scrollX = snapshot.centerX - cam.width / (2 * zoom);
    cam.scrollY = snapshot.centerY - cam.height / (2 * zoom);
    const vw = cam.width / cam.zoom;
    const vh = cam.height / cam.zoom;
    const maxX = Math.max(0, world.width - vw);
    const maxY = Math.max(0, world.height - vh);
    cam.scrollX = Math.min(Math.max(cam.scrollX, 0), maxX);
    cam.scrollY = Math.min(Math.max(cam.scrollY, 0), maxY);

    return true;
};

export const applyRequestedCamera = (
    cam: Phaser.Cameras.Scene2D.Camera,
    snapshot: SerializedCameraState | null,
    config: CameraConfig,
    world: WorldConfig,
): boolean => {
    if (!snapshot || matchesCameraState(cam, snapshot)) return false;
    return applyRestore(cam, snapshot, config, world);
};

