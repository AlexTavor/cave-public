import type { SerializedCameraState } from "../../runtime/persistence/types";

const POSITION_TOLERANCE = 0.5;
const ZOOM_TOLERANCE = 0.001;

export const cameraStatesEquivalent = (
    left: SerializedCameraState,
    right: SerializedCameraState,
) =>
    Math.abs(left.centerX - right.centerX) < POSITION_TOLERANCE &&
    Math.abs(left.centerY - right.centerY) < POSITION_TOLERANCE &&
    Math.abs(left.zoom - right.zoom) < ZOOM_TOLERANCE;
