import React from "react";
import { CaveStatusNote } from "../../status/CaveStatusNote";
import { OverlaySlot } from "./NodeOverlayViewport.styles";

export const CaveStatusOverlay: React.FC<{
    hidden: boolean;
    position: { x: number; y: number } | null;
}> = ({ hidden, position }) => {
    return (
        <OverlaySlot
            data-testid="cave-status-overlay"
            $hidden={hidden}
            $x={position?.x ?? 0}
            $y={position?.y ?? 0}
        >
            {hidden ? null : <CaveStatusNote anchored={false} />}
        </OverlaySlot>
    );
};
