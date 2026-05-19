import React, { type RefObject } from "react";
import { CaveStatusOverlay } from "./CaveStatusOverlay";
import { useCaveStatusOverlayPosition } from "./useCaveStatusOverlayPosition";

export const CaveStatusOverlayLayer: React.FC<{
    rootRef: RefObject<HTMLDivElement | null>;
    enabled: boolean;
    focusedIds: Set<string> | null;
}> = ({ rootRef, enabled, focusedIds }) => {
    const position = useCaveStatusOverlayPosition(rootRef, enabled);
    return (
        <CaveStatusOverlay
            hidden={
                !position ||
                (focusedIds !== null && !focusedIds.has("sys_world"))
            }
            position={position}
        />
    );
};
