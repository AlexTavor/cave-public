import type { RefObject } from "react";
import { useElementSize } from "../../../lib/foundation/layout/useElementSize";
import { useRuntimeStore } from "../../state/useRuntimeStore";
import { useWorldInteraction } from "../context/WorldInteractionContext";
import { runtimeCalloutStore } from "./runtime-callouts/runtimeCalloutStore";
import type { RuntimeCalloutItem } from "./runtime-callouts/runtimeCalloutTypes";

export type NodeOverlayViewportInputs = {
    runtime: object | null;
    getCameraState: ReturnType<typeof useWorldInteraction>["getCameraState"];
    cameraRevision: number;
    viewportWidth: number;
    viewportHeight: number;
    runtimeCalloutItems: RuntimeCalloutItem[];
};

export const useNodeOverlayViewportInputs = (
    rootRef: RefObject<HTMLElement | null>,
): NodeOverlayViewportInputs => {
    const { runtime, getCameraState } = useWorldInteraction();
    const cameraRevision = useRuntimeStore((state) => state.cameraRevision);
    const runtimeCalloutItems = runtimeCalloutStore((state) => state.items);
    const [width, height] = useElementSize(rootRef);
    return {
        runtime,
        getCameraState,
        cameraRevision,
        viewportWidth: width || rootRef.current?.clientWidth || 0,
        viewportHeight: height || rootRef.current?.clientHeight || 0,
        runtimeCalloutItems,
    };
};
