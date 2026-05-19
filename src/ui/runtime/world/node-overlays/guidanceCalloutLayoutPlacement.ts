import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { SerializedCameraState } from "../../../../engine/runtime/persistence/types";
import {
    resolveBottomNodeOverlayPosition,
    resolveTopNodeOverlayPosition,
} from "./nodeOverlayPosition";
import { resolveNodeOverlayDisplayBounds } from "./resolveNodeOverlayDisplayBounds";

const CALLOUT_WIDTH_PX = 220;
const CALLOUT_HEIGHT_PX = 70;

export type NodeCalloutAnchor = "above" | "below";

export const NODE_SLOTS = [
    "top",
    "top_right",
    "right",
    "bottom_right",
    "bottom",
    "bottom_left",
    "left",
    "top_left",
] as const;
export const SCREEN_SLOTS = [
    "top_left",
    "top_right",
    "bottom_left",
    "bottom_right",
    "center",
] as const;
export const OFFSETS = {
    top: [0, 0],
    top_right: [130, -10],
    right: [150, 24],
    bottom_right: [120, 0],
    bottom: [0, 0],
    bottom_left: [-120, 0],
    left: [-150, 24],
    top_left: [-130, -10],
} as const;

export const overlaps = (left: any, right: any) =>
    left.x < right.x + right.w &&
    left.x + left.w > right.x &&
    left.y < right.y + right.h &&
    left.y + left.h > right.y;

export const rotate = <T>(items: readonly T[], first: T) => {
    const index = items.indexOf(first);
    return index < 0
        ? [...items]
        : [...items.slice(index), ...items.slice(0, index)];
};

export const toCalloutRect = (
    x: number,
    y: number,
    anchor: NodeCalloutAnchor = "above",
) => ({
    x: x - CALLOUT_WIDTH_PX / 2,
    y: anchor === "below" ? y : y - CALLOUT_HEIGHT_PX,
    w: CALLOUT_WIDTH_PX,
    h: CALLOUT_HEIGHT_PX,
});

export const toNodeCalloutAnchor = (
    slot: (typeof NODE_SLOTS)[number],
): NodeCalloutAnchor =>
    slot === "bottom" || slot === "bottom_left" || slot === "bottom_right"
        ? "below"
        : "above";

export const toScreenPoint = (
    slot: (typeof SCREEN_SLOTS)[number],
    width: number,
    height: number,
) =>
    ({
        top_left: [120, 100],
        top_right: [width - 120, 100],
        bottom_left: [120, height - 100],
        bottom_right: [width - 120, height - 100],
        center: [width / 2, height / 2],
    })[slot];

export const toNodePoint = (
    runtime: Runtime,
    camera: SerializedCameraState | null,
    width: number,
    height: number,
    targetId: string,
    slot: (typeof NODE_SLOTS)[number],
) => {
    const bounds = resolveNodeOverlayDisplayBounds(runtime, targetId);
    if (!bounds || !camera || width <= 0 || height <= 0) return null;
    return toNodeCalloutAnchor(slot) === "below"
        ? resolveBottomNodeOverlayPosition({
              cameraState: camera,
              viewportWidth: width,
              viewportHeight: height,
              bounds,
          })
        : resolveTopNodeOverlayPosition({
              cameraState: camera,
              viewportWidth: width,
              viewportHeight: height,
              bounds,
          });
};
