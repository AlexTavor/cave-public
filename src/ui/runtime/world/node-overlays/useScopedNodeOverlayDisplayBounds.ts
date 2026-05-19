import type { NodeOverlayDisplayBounds } from "../../../../engine/phaser/display/node-overlay/nodeOverlayDisplayBounds";
import { useNodeOverlayDisplayBoundsStore } from "../../../../engine/phaser/display/node-overlay/nodeOverlayDisplayBoundsStore";
import { normalizeRuntimeEntityIds } from "../../hooks/runtimeInvalidationScopes";
import { useShallow } from "zustand/react/shallow";

const EMPTY_BOUNDS: readonly (NodeOverlayDisplayBounds | null)[] = [];

export const useScopedNodeOverlayDisplayBounds = (
    entityIds: readonly string[],
): readonly (NodeOverlayDisplayBounds | null)[] => {
    const normalizedIds = normalizeRuntimeEntityIds([...entityIds]);
    return useNodeOverlayDisplayBoundsStore(
        useShallow((state) =>
            normalizedIds.length === 0
                ? EMPTY_BOUNDS
                : normalizedIds.map((id) => state.byEntityId[id] ?? null),
        ),
    );
};
