import type Phaser from "phaser";
import type { CameraControllerCallbacks } from "./types";
import type {
    CameraConfig,
    WorldConfig,
} from "../../../data/schemas/game/cameraWorldConfig";
import type { DragState } from "./cameraInputHandlers";
import type { PinchState } from "./cameraTouch";

export interface BindingState {
    vx: number;
    vy: number;
    drag: DragState | null;
    pinch: PinchState | null;
}

export interface BindingContext {
    scene: Phaser.Scene;
    callbacks: CameraControllerCallbacks;
    getConfig: () => CameraConfig;
    getState: () => BindingState;
    getWorld: () => WorldConfig;
    isPointerOverObject: (pointer: Phaser.Input.Pointer) => boolean;
    setState: (next: Partial<BindingState>) => void;
}
