import type { Runtime } from "../../runtime/Runtime";
import type { CameraController } from "../camera/CameraController";

export const attachRuntimeIfNeeded = (
    current: Runtime | null,
    next: Runtime | null,
    cameraController: CameraController,
): Runtime | null => {
    if (!next || next === current) return current;
    cameraController.attachRuntime(next);
    return next;
};
