import React, { useMemo, type RefObject } from "react";
import { Portal } from "../../../lib/foundation/portal-manager/Portal";
import { useActiveRuntimeAttention } from "../../attention/useActiveRuntimeAttention";
import { CaveStatusOverlayLayer } from "./CaveStatusOverlayLayer";
import {
    GuidanceCalloutLayer,
    NodeOverlayCardsLayer,
    RuntimeCalloutLayer,
} from "./NodeOverlayViewportLayers";
import { OverlayRoot } from "./NodeOverlayViewport.styles";
import type {
    GuidanceModel,
    RuntimeCalloutModel,
    ScreenGuidanceModel,
} from "./overlayViewportModels";
import type { ResolvedNodeOverlayModel } from "./nodeOverlayTypes";
import { ScreenOverlay } from "./ScreenOverlay";

export const NodeOverlayViewportView: React.FC<{
    rootRef: RefObject<HTMLDivElement | null>;
    enabled: boolean;
    nodeModels: ResolvedNodeOverlayModel[];
    guidanceModels: GuidanceModel[];
    runtimeCalloutModels: RuntimeCalloutModel[];
    screenGuidanceModels: ScreenGuidanceModel[];
}> = ({
    rootRef,
    enabled,
    nodeModels,
    guidanceModels,
    runtimeCalloutModels,
    screenGuidanceModels,
}) => {
    const attention = useActiveRuntimeAttention();
    const focusKey = attention?.focusEntityIds.join("|") ?? "";
    const focusedIds = useMemo(
        () =>
            attention?.blockNonFocusedInteraction === true && focusKey
                ? new Set(attention.focusEntityIds)
                : null,
        [attention?.blockNonFocusedInteraction, focusKey],
    );
    return (
        <>
            <OverlayRoot ref={rootRef} data-testid="node-overlay-viewport">
                <CaveStatusOverlayLayer
                    rootRef={rootRef}
                    enabled={enabled}
                    focusedIds={focusedIds}
                />
                <NodeOverlayCardsLayer
                    nodeModels={nodeModels}
                    guidanceModels={guidanceModels}
                    focusedIds={focusedIds}
                />
            </OverlayRoot>
            <Portal layer="callout">
                <GuidanceCalloutLayer
                    guidanceModels={guidanceModels}
                    focusedIds={focusedIds}
                />
                <RuntimeCalloutLayer
                    runtimeCalloutModels={runtimeCalloutModels}
                />
            </Portal>
            <ScreenOverlay models={screenGuidanceModels} />
        </>
    );
};
