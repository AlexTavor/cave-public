import { useRef, type RefObject } from "react";
import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { ScreenPosition } from "./nodeOverlayTypes";
import { resolveCaveStatusPosition } from "./overlayViewportModels";
import { positionEqual } from "./nodeOverlayViewportLayerUtils";
import { useNodeOverlayViewportInputs } from "./useNodeOverlayViewportInputs";
import { useScopedNodeOverlayDisplayBounds } from "./useScopedNodeOverlayDisplayBounds";

type CaveStatusCache = {
    runtime: Runtime;
    width: number;
    height: number;
    cameraRevision: number;
    displayBounds: readonly unknown[];
    position: ScreenPosition | null;
};

export const useCaveStatusOverlayPosition = (
    rootRef: RefObject<HTMLElement | null>,
    enabled: boolean,
): ScreenPosition | null => {
    const inputs = useNodeOverlayViewportInputs(rootRef);
    const displayBounds = useScopedNodeOverlayDisplayBounds(["sys_world"]);
    const cacheRef = useRef<CaveStatusCache | null>(null);
    const runtime = enabled ? (inputs.runtime as Runtime | null) : null;
    if (!runtime || inputs.viewportWidth <= 0 || inputs.viewportHeight <= 0) {
        cacheRef.current = null;
        return null;
    }
    const cached = cacheRef.current;
    if (
        cached?.runtime === runtime &&
        cached.width === inputs.viewportWidth &&
        cached.height === inputs.viewportHeight &&
        cached.cameraRevision === inputs.cameraRevision &&
        cached.displayBounds === displayBounds
    ) {
        return cached.position;
    }
    const next = resolveCaveStatusPosition(
        runtime,
        inputs.getCameraState(),
        inputs.viewportWidth,
        inputs.viewportHeight,
    );
    const position =
        cached && positionEqual(cached.position, next) ? cached.position : next;
    cacheRef.current = {
        runtime,
        width: inputs.viewportWidth,
        height: inputs.viewportHeight,
        cameraRevision: inputs.cameraRevision,
        displayBounds,
        position,
    };
    return position;
};
