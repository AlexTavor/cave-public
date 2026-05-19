import { useRef, type RefObject } from "react";
import { overlayViewportDataEqual } from "./nodeOverlayViewportDataEqual";
import {
    EMPTY_OVERLAY_VIEWPORT_DATA,
    type OverlayViewportData,
} from "./resolveOverlayViewportData";
import { useCaveStatusOverlayPosition } from "./useCaveStatusOverlayPosition";
import { useNodeOverlayViewportInputs } from "./useNodeOverlayViewportInputs";
import { useNodeOverlayNodeModels } from "./useNodeOverlayNodeModels";
import { useNodeOverlayAuxiliaryData } from "./useNodeOverlayAuxiliaryData";

export { useNodeOverlayViewportInputs } from "./useNodeOverlayViewportInputs";
export type { NodeOverlayViewportInputs } from "./useNodeOverlayViewportInputs";
export { useNodeOverlayAuxiliaryData } from "./useNodeOverlayAuxiliaryData";

export const useNodeOverlayViewportData = (
    rootRef: RefObject<HTMLElement | null>,
    enabled: boolean,
): OverlayViewportData => {
    const nodeModels = useNodeOverlayNodeModels(rootRef, enabled);
    const inputs = useNodeOverlayViewportInputs(rootRef);
    const auxiliary = useNodeOverlayAuxiliaryData(inputs, enabled);
    const caveStatusPosition = useCaveStatusOverlayPosition(rootRef, enabled);
    const cacheRef = useRef(EMPTY_OVERLAY_VIEWPORT_DATA);
    const next = {
        nodeModels,
        ...auxiliary,
        caveStatusPosition,
    };
    if (!overlayViewportDataEqual(cacheRef.current, next))
        cacheRef.current = next;
    return cacheRef.current;
};
