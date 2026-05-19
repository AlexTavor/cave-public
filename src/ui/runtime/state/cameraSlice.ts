import type { SerializedCameraState } from "../../../engine/runtime/persistence/types";
import { cameraStatesEquivalent } from "../../../engine/phaser/camera/cameraStateComparison";

export interface CameraSliceState {
    cameraState: SerializedCameraState | null;
    pendingCameraRestore: SerializedCameraState | null;
    cameraRevision: number;
}

export interface CameraSliceActions {
    setCameraState: (state: SerializedCameraState) => void;
    setPendingCameraRestore: (state: SerializedCameraState | null) => void;
    consumePendingCameraRestore: () => SerializedCameraState | null;
}

export const createCameraActions = (
    set: (fn: (s: CameraSliceState) => void) => void,
    get: () => CameraSliceState,
): CameraSliceActions => ({
    setCameraState: (camera) => {
        const current = get().cameraState;
        if (current && cameraStatesEquivalent(current, camera)) {
            return;
        }
        set((s) => {
            s.cameraState = camera;
            s.cameraRevision += 1;
        });
    },
    setPendingCameraRestore: (camera) => {
        set((s) => {
            s.pendingCameraRestore = camera;
        });
    },
    consumePendingCameraRestore: () => {
        const pending = get().pendingCameraRestore;
        if (pending) {
            set((s) => {
                s.pendingCameraRestore = null;
            });
        }
        return pending;
    },
});

