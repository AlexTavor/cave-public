import React from "react";
import { Portal } from "../../../lib/foundation/portal-manager/Portal";
import { RichText } from "../../../lib/atoms/rich-text/RichText";
import { resolveTutorialGifSrc } from "../../tutorials/resolveTutorialGifSrc";
import {
    ScreenOverlayCardShell,
    ScreenOverlayImage,
    ScreenOverlayRoot,
    ScreenOverlaySlotCard,
} from "./ScreenOverlay.styles";
import type { OverlayViewportData } from "./resolveOverlayViewportData";

export const ScreenOverlay: React.FC<{
    models: OverlayViewportData["screenGuidanceModels"];
}> = ({ models }) => {
    if (models.length === 0) return null;

    return (
        <Portal layer="callout">
            <ScreenOverlayRoot data-testid="screen-overlay">
                {models.map((model) => (
                    <ScreenOverlaySlotCard
                        key={model.bindingId}
                        data-testid="runtime-guidance-callout"
                        data-guidance-layer="screen"
                        data-guidance-slot={model.slot}
                        $slot={model.slot}
                    >
                        <ScreenOverlayCardShell padding="sm">
                            {model.imageUrl ? (
                                <ScreenOverlayImage
                                    src={resolveTutorialGifSrc(model.imageUrl)}
                                    alt=""
                                />
                            ) : null}
                            <RichText text={model.text} variant="callout" />
                        </ScreenOverlayCardShell>
                    </ScreenOverlaySlotCard>
                ))}
            </ScreenOverlayRoot>
        </Portal>
    );
};
