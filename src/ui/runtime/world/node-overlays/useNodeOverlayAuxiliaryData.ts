import { useRef } from "react";
import type { Runtime } from "../../../../engine/runtime/Runtime";
import {
    EMPTY_NODE_OVERLAY_AUXILIARY_DATA,
    type NodeOverlayAuxiliaryData,
    arrayEqual,
    guidanceEqual,
    runtimeCalloutEqual,
    screenGuidanceEqual,
} from "./nodeOverlayViewportLayerUtils";
import {
    resolveGuidanceModels,
    resolveRuntimeCalloutModels,
    resolveScreenGuidanceModels,
} from "./overlayViewportModels";
import type { NodeOverlayViewportInputs } from "./useNodeOverlayViewportInputs";
import { useNodeOverlayGuidanceViews } from "./useNodeOverlayGuidanceViews";
import { resolveTrackedNodeOverlayTargetIds } from "./nodeOverlayGuidanceUtils";
import { useScopedNodeOverlayDisplayBounds } from "./useScopedNodeOverlayDisplayBounds";

type AuxiliaryCache = {
    runtime: Runtime;
    guidanceViews: object;
    runtimeCalloutItems: object;
    getCameraState: object;
    width: number;
    height: number;
    cameraRevision: number;
    displayBounds: readonly unknown[];
    data: NodeOverlayAuxiliaryData;
};

const reuseAuxiliaryRefs = (
    previous: NodeOverlayAuxiliaryData,
    next: NodeOverlayAuxiliaryData,
) => ({
    guidanceModels: arrayEqual(
        previous.guidanceModels,
        next.guidanceModels,
        guidanceEqual,
    )
        ? previous.guidanceModels
        : next.guidanceModels,
    screenGuidanceModels: arrayEqual(
        previous.screenGuidanceModels,
        next.screenGuidanceModels,
        screenGuidanceEqual,
    )
        ? previous.screenGuidanceModels
        : next.screenGuidanceModels,
    runtimeCalloutModels: arrayEqual(
        previous.runtimeCalloutModels,
        next.runtimeCalloutModels,
        runtimeCalloutEqual,
    )
        ? previous.runtimeCalloutModels
        : next.runtimeCalloutModels,
});

export const useNodeOverlayAuxiliaryData = (
    inputs: NodeOverlayViewportInputs,
    enabled: boolean,
) => {
    const runtime = enabled ? (inputs.runtime as Runtime | null) : null;
    const guidances = useNodeOverlayGuidanceViews(runtime, enabled);
    const displayBounds = useScopedNodeOverlayDisplayBounds(
        resolveTrackedNodeOverlayTargetIds(
            guidances,
            inputs.runtimeCalloutItems,
        ),
    );
    const cacheRef = useRef<AuxiliaryCache | null>(null);
    if (!runtime || inputs.viewportWidth <= 0 || inputs.viewportHeight <= 0) {
        cacheRef.current = null;
        return EMPTY_NODE_OVERLAY_AUXILIARY_DATA;
    }
    const cached = cacheRef.current;
    if (
        cached?.runtime === runtime &&
        cached.guidanceViews === guidances &&
        cached.runtimeCalloutItems === inputs.runtimeCalloutItems &&
        cached.getCameraState === inputs.getCameraState &&
        cached.width === inputs.viewportWidth &&
        cached.height === inputs.viewportHeight &&
        cached.cameraRevision === inputs.cameraRevision &&
        cached.displayBounds === displayBounds
    ) {
        return cached.data;
    }
    const next = {
        guidanceModels: resolveGuidanceModels(
            runtime,
            inputs.getCameraState(),
            inputs.viewportWidth,
            inputs.viewportHeight,
            guidances,
        ),
        screenGuidanceModels: resolveScreenGuidanceModels(guidances),
        runtimeCalloutModels: resolveRuntimeCalloutModels(
            runtime,
            inputs.getCameraState(),
            inputs.viewportWidth,
            inputs.viewportHeight,
            inputs.runtimeCalloutItems,
        ),
    };
    const data = reuseAuxiliaryRefs(
        cached?.data ?? EMPTY_NODE_OVERLAY_AUXILIARY_DATA,
        next,
    );
    cacheRef.current = {
        runtime,
        guidanceViews: guidances,
        runtimeCalloutItems: inputs.runtimeCalloutItems,
        getCameraState: inputs.getCameraState,
        width: inputs.viewportWidth,
        height: inputs.viewportHeight,
        cameraRevision: inputs.cameraRevision,
        displayBounds,
        data,
    };
    return data;
};
