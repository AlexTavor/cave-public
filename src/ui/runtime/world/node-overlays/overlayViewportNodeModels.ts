import type { SerializedCameraState } from "../../../../engine/runtime/persistence/types";
import type { Runtime } from "../../../../engine/runtime/Runtime";
import { filterVisibleNodeOverlayModels } from "./filterVisibleNodeOverlayModels";
import { resolveTopNodeOverlayPosition } from "./nodeOverlayPosition";
import type {
    ResolvedNodeOverlayEntry,
    ResolvedNodeOverlayModel,
    ScreenPosition,
} from "./nodeOverlayTypes";
import { resolveNodeOverlayDisplayBounds } from "./resolveNodeOverlayDisplayBounds";

export const projectNodeOverlayModels = (
    runtime: Runtime,
    cameraState: SerializedCameraState | null,
    viewportWidth: number,
    viewportHeight: number,
    nodeEntries: ResolvedNodeOverlayEntry[],
    displayBoundsByEntry?: readonly (ScreenPosition | null)[] | readonly any[],
): ResolvedNodeOverlayModel[] =>
    filterVisibleNodeOverlayModels(
        nodeEntries.flatMap((entry, index) => {
            const bounds = resolveNodeOverlayDisplayBounds(
                runtime,
                entry.entityId,
                displayBoundsByEntry?.[index] ?? null,
            );
            const position = bounds
                ? resolveTopNodeOverlayPosition({
                      cameraState,
                      viewportWidth,
                      viewportHeight,
                      bounds,
                  })
                : null;
            return position ? [{ ...entry, position }] : [];
        }),
    );

export const resolveCaveStatusPosition = (
    runtime: Runtime,
    cameraState: SerializedCameraState | null,
    width: number,
    height: number,
): ScreenPosition | null => {
    const bounds = resolveNodeOverlayDisplayBounds(runtime, "sys_world", null);
    return bounds
        ? resolveTopNodeOverlayPosition({
              cameraState: cameraState ?? { centerX: 0, centerY: 0, zoom: 1 },
              viewportWidth: width,
              viewportHeight: height,
              bounds,
          })
        : null;
};
