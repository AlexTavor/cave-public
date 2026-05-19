import Phaser from "phaser";
import type { Runtime } from "../../runtime/Runtime";
import { DEFAULT_GAME_CONFIG } from "../../../data/schemas/game/config";
import type { CameraInputBindings } from "./cameraControllerBootstrap";
import type { CameraControllerCallbacks } from "./types";
import type {
    CameraConfig,
    WorldConfig,
} from "../../../data/schemas/game/cameraWorldConfig";
import {
    clampAndApply,
    publishCameraState,
    type DragState,
} from "./cameraInputHandlers";
import { applyRequestedCamera } from "./cameraRestore";
import type { PinchState } from "./cameraTouch";
import {
    applyCameraMomentum,
    applyBootstrapCamera,
    readCameraBootstrapConfig,
    toggleCameraInput,
} from "./cameraControllerBootstrap";
import { createCameraInputBindings } from "./cameraControllerBindings";

export class CameraController {
    private readonly scene: Phaser.Scene;
    private readonly cb: CameraControllerCallbacks;
    private world: WorldConfig = DEFAULT_GAME_CONFIG.world;
    private cfg: CameraConfig = DEFAULT_GAME_CONFIG.camera;
    private vx = 0;
    private vy = 0;
    private drag: DragState | null = null;
    private pinch: PinchState | null = null;
    private ready = false;
    private readonly handlers: CameraInputBindings;

    constructor(scene: Phaser.Scene, callbacks: CameraControllerCallbacks) {
        this.scene = scene;
        this.cb = callbacks;
        this.handlers = createCameraInputBindings({
            scene,
            callbacks,
            getConfig: () => this.cfg,
            getState: () => ({
                vx: this.vx,
                vy: this.vy,
                drag: this.drag,
                pinch: this.pinch,
            }),
            getWorld: () => this.world,
            isPointerOverObject: this.isPointerOverObject,
            setState: ({ vx, vy, drag, pinch }) => {
                if (vx !== undefined) this.vx = vx;
                if (vy !== undefined) this.vy = vy;
                if (drag !== undefined) this.drag = drag;
                if (pinch !== undefined) this.pinch = pinch;
            },
        });
    }

    public attachRuntime(runtime: Runtime): void {
        const config = readCameraBootstrapConfig(runtime);
        this.world = config.world;
        this.cfg = config.camera;
        runtime.setWorldBounds(this.world.width, this.world.height);
        applyBootstrapCamera(
            this.scene.cameras.main,
            runtime,
            this.cb.consumePendingCameraRestore(),
            this.cfg,
            this.world,
        );
        this.ready = true;
    }

    public bindInput(): void {
        const pointerCount = Reflect.get(
            this.scene.input as object,
            "pointersTotal",
        );
        if ((pointerCount ?? 1) < 2) this.scene.input.addPointer(1);
        toggleCameraInput(this.scene, this, this.handlers, "on");
    }

    public update(): void {
        if (!this.ready) return;
        if (
            applyRequestedCamera(
                this.scene.cameras.main,
                this.cb.consumePendingCameraRestore() ??
                    this.cb.getCameraState(),
                this.cfg,
                this.world,
            )
        ) {
            this.vx = 0;
            this.vy = 0;
        }
        if (!this.drag) {
            const velocity = { x: this.vx, y: this.vy };
            applyCameraMomentum(
                this.scene.cameras.main,
                this.cfg.pan.damping,
                velocity,
            );
            this.vx = velocity.x;
            this.vy = velocity.y;
        }
        clampAndApply(this.scene.cameras.main, this.world);

        publishCameraState(this.scene.cameras.main, this.cb.setCameraState);
    }

    public destroy(): void {
        toggleCameraInput(this.scene, this, this.handlers, "off");
    }

    private readonly isPointerOverObject = (pointer: Phaser.Input.Pointer) =>
        this.scene.input.hitTestPointer(pointer).length > 0;
}

