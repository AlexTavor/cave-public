import React, { useRef } from "react";
import { useNodeOverlaysEnabled } from "./useNodeOverlaysEnabled";
import { useNodeOverlayValuesEnabled } from "./useNodeOverlayValuesEnabled";
import { NodeOverlayViewportView } from "./NodeOverlayViewportView";
import { useNodeOverlayNodeModels } from "./useNodeOverlayNodeModels";
import { useNodeOverlayViewportInputs } from "./useNodeOverlayViewportInputs";
import { useNodeOverlayAuxiliaryData } from "./useNodeOverlayAuxiliaryData";

export const NodeOverlayViewport: React.FC = () => {
    const enabled = useNodeOverlaysEnabled();
    const showValues = useNodeOverlayValuesEnabled();
    const rootRef = useRef<HTMLDivElement>(null);
    const nodeModels = useNodeOverlayNodeModels(rootRef, enabled, showValues);
    const inputs = useNodeOverlayViewportInputs(rootRef);
    const auxiliary = useNodeOverlayAuxiliaryData(inputs, enabled);
    return (
        <NodeOverlayViewportView
            rootRef={rootRef}
            enabled={enabled}
            nodeModels={nodeModels}
            guidanceModels={auxiliary.guidanceModels}
            runtimeCalloutModels={auxiliary.runtimeCalloutModels}
            screenGuidanceModels={auxiliary.screenGuidanceModels}
        />
    );
};
