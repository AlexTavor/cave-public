import type { SerializedCameraState } from "../../../../engine/runtime/persistence/types";
import type { Runtime } from "../../../../engine/runtime/Runtime";
import {
    projectNodeOverlayModels,
    resolveCaveStatusPosition,
    resolveGuidanceModels,
    resolveRuntimeCalloutModels,
    resolveRuntimeGuidanceViews,
    resolveScreenGuidanceModels,
    type GuidanceModel,
    type RuntimeCalloutModel,
    type ScreenGuidanceModel,
} from "./overlayViewportModels";
import type {
    ScreenPosition,
    ResolvedNodeOverlayEntry,
    ResolvedNodeOverlayModel,
} from "./nodeOverlayTypes";
import type { RuntimeCalloutItem } from "./runtime-callouts/runtimeCalloutTypes";

export type OverlayViewportData = {
    nodeModels: ResolvedNodeOverlayModel[];
    guidanceModels: GuidanceModel[];
    runtimeCalloutModels: RuntimeCalloutModel[];
    screenGuidanceModels: ScreenGuidanceModel[];
    caveStatusPosition: ScreenPosition | null;
};

export const EMPTY_OVERLAY_VIEWPORT_DATA: OverlayViewportData = {
    nodeModels: [],
    guidanceModels: [],
    runtimeCalloutModels: [],
    screenGuidanceModels: [],
    caveStatusPosition: null,
};

export const resolveOverlayViewportData = (
    runtime: Runtime | null,
    cameraState: SerializedCameraState | null,
    viewportWidth: number,
    viewportHeight: number,
    runtimeCalloutItems: RuntimeCalloutItem[],
    nodeEntries: ResolvedNodeOverlayEntry[],
): OverlayViewportData => {
    if (!runtime || viewportWidth <= 0 || viewportHeight <= 0)
        return EMPTY_OVERLAY_VIEWPORT_DATA;
    const guidances = resolveRuntimeGuidanceViews(runtime);
    return {
        nodeModels: projectNodeOverlayModels(
            runtime,
            cameraState,
            viewportWidth,
            viewportHeight,
            nodeEntries,
        ),
        guidanceModels: resolveGuidanceModels(
            runtime,
            cameraState,
            viewportWidth,
            viewportHeight,
            guidances,
        ),
        runtimeCalloutModels: resolveRuntimeCalloutModels(
            runtime,
            cameraState,
            viewportWidth,
            viewportHeight,
            runtimeCalloutItems,
        ),
        screenGuidanceModels: resolveScreenGuidanceModels(guidances),
        caveStatusPosition: resolveCaveStatusPosition(
            runtime,
            cameraState,
            viewportWidth,
            viewportHeight,
        ),
    };
};
