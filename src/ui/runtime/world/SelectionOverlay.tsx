import React, { useMemo } from "react";
import { useSelectedEntity } from "./useSelectedEntity";
import { OverlayRoot, OverlayState } from "./SelectionOverlay.styles";
import { resolveSelectionLens } from "./selection/selectionLensMap";
import { PointerSelectorOverlay } from "./pointer/PointerSelectorOverlay";

const stopPointerEvent = (event: React.SyntheticEvent) => {
    event.stopPropagation();
};

export const SelectionOverlay: React.FC = () => {
    const { runtime, entity, selectedId } = useSelectedEntity();

    const lens = useMemo(() => {
        if (!entity) return null;
        return resolveSelectionLens(entity, runtime);
    }, [entity, runtime]);

    const pointerOverlay = <PointerSelectorOverlay runtime={runtime} />;
    if (!selectedId || !entity) return pointerOverlay;

    const LensComponent = lens?.Component ?? null;

    return (
        <OverlayRoot
            onClick={stopPointerEvent}
            onContextMenu={stopPointerEvent}
            onMouseDown={stopPointerEvent}
            onMouseUp={stopPointerEvent}
            onPointerDown={stopPointerEvent}
            onPointerUp={stopPointerEvent}
            onWheel={stopPointerEvent}
        >
            {pointerOverlay}
            {LensComponent ? (
                <LensComponent entity={entity} runtime={runtime} />
            ) : (
                <OverlayState>No lens available.</OverlayState>
            )}
        </OverlayRoot>
    );
};

