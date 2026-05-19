import React from "react";
import { resolveTutorialGifSrc } from "../../tutorials/resolveTutorialGifSrc";
import { CardShell, OverlaySlot } from "./NodeOverlayViewport.styles";
import { RichText } from "../../../lib/atoms/rich-text/RichText";
import type { NodeCalloutAnchor } from "./guidanceCalloutLayoutPlacement";

export const GuidanceCalloutCard: React.FC<{
    model: {
        bindingId: string;
        text: string;
        imageUrl: string | null;
        anchor: NodeCalloutAnchor;
        x: number;
        y: number;
    };
}> = ({ model }) => (
    <OverlaySlot
        data-testid="runtime-guidance-callout"
        data-guidance-id={model.bindingId}
        data-guidance-anchor={model.anchor}
        $hidden={false}
        $anchor={model.anchor}
        $x={model.x}
        $y={model.y}
    >
        <CardShell padding="sm" variant="transparent">
            {model.imageUrl ? (
                <img
                    src={resolveTutorialGifSrc(model.imageUrl)}
                    alt=""
                    width={36}
                    height={36}
                />
            ) : null}
            <RichText text={model.text} variant="callout" />
        </CardShell>
    </OverlaySlot>
);
