import type Phaser from "phaser";
import type { Runtime } from "../../runtime/Runtime";
import {
    GameConfigSchema,
    DEFAULT_GAME_CONFIG,
} from "../../../data/schemas/game/config";
import type {
    CameraConfig,
    WorldConfig,
} from "../../../data/schemas/game/cameraWorldConfig";
import type { SerializedCameraState } from "../../runtime/persistence/types";
import { clampCenter, evaluateZoom } from "./cameraControllerMath";
import { applyRestore } from "./cameraInputHandlers";

export interface CameraInputBindings {
    down: (...args: any[]) => void;
    move: (...args: any[]) => void;
    up: (...args: any[]) => void;
    wheel: (...args: any[]) => void;
}

export const toggleCameraInput = (
    scene: Phaser.Scene,
    context: unknown,
    bindings: CameraInputBindings,
    on: "on" | "off",
): void => {
    const input = scene.input;
    if (on === "on") {
        input.on("pointerdown", bindings.down, context);
        input.on("pointermove", bindings.move, context);
        input.on("pointerup", bindings.up, context);
        input.on("wheel", bindings.wheel as any, context);
        return;
    }
    input.off("pointerdown", bindings.down, context);
    input.off("pointermove", bindings.move, context);
    input.off("pointerup", bindings.up, context);
    input.off("wheel", bindings.wheel as any, context);
};

export const readCameraBootstrapConfig = (
    runtime: Runtime,
): { camera: CameraConfig; world: WorldConfig } => {
    const cartridge = runtime.getCartridge();
    const raw =
        cartridge.config?.settings?.game_config ??
        cartridge.assets?.settings?.game_config;
    const result = GameConfigSchema.safeParse(raw ?? {});
    if (!result.success && raw !== undefined) {
        console.error(
            "CameraController: game_config parse failed",
            result.error,
        );
    }
    const config = result.success ? result.data : DEFAULT_GAME_CONFIG;
    return { camera: config.camera, world: config.world };
};

const readWorldCenter = (runtime: Runtime): { x: number; y: number } | null => {
    const world = runtime.getEntity("sys_world") as
        | { physics?: { x?: number; y?: number } }
        | undefined;
    const x = world?.physics?.x;
    const y = world?.physics?.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x: Number(x), y: Number(y) };
};

export const applyBootstrapCamera = (
    cam: Phaser.Cameras.Scene2D.Camera,
    runtime: Runtime,
    restore: SerializedCameraState | null,
    config: CameraConfig,
    world: WorldConfig,
): void => {
    cam.setOrigin(0, 0);
    if (restore && applyRestore(cam, restore, config, world)) return;
    cam.setZoom(
        evaluateZoom(
            config.zoom.start,
            config,
            { width: cam.width, height: cam.height },
            world,
        ) ?? config.zoom.max,
    );
    const center = readWorldCenter(runtime) ?? {
        x: world.width / 2,
        y: world.height / 2,
    };
    const clamped = clampCenter(
        center.x,
        center.y,
        { width: cam.width, height: cam.height },
        cam.zoom,
        world,
    );
    cam.scrollX = clamped.x - cam.width / (2 * cam.zoom);
    cam.scrollY = clamped.y - cam.height / (2 * cam.zoom);
};

export const applyCameraMomentum = (
    cam: Phaser.Cameras.Scene2D.Camera,
    damping: number,
    velocity: { x: number; y: number },
): void => {
    if (Math.abs(velocity.x) <= 0.1 && Math.abs(velocity.y) <= 0.1) return;
    cam.scrollX += velocity.x;
    cam.scrollY += velocity.y;
    velocity.x *= 1 - damping;
    velocity.y *= 1 - damping;
};
