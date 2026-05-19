import type { SerializedCameraState } from "../../../engine/runtime/persistence/types";

export interface CameraControllerCallbacks {
    selectEntity: (id: string | null) => void;
    getCameraState: () => SerializedCameraState | null;
    setCameraState: (state: SerializedCameraState) => void;
    consumePendingCameraRestore: () => SerializedCameraState | null;
}
