import React from "react";
import { CardShell, OverlaySlot } from "../NodeOverlayViewport.styles";
import { RichText } from "../../../../lib/atoms/rich-text/RichText";

export const RuntimeCalloutCard: React.FC<{
    model: { id: string; x: number; y: number; text: string };
}> = ({ model }) => (
    <OverlaySlot
        data-testid="runtime-callout"
        data-callout-id={model.id}
        $hidden={false}
        $x={model.x}
        $y={model.y}
    >
        <CardShell padding="sm">
            <RichText text={model.text} />
        </CardShell>
    </OverlaySlot>
);
