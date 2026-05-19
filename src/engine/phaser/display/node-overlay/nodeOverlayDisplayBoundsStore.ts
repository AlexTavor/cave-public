import { create } from "zustand";
import type { NodeOverlayDisplayBounds } from "./nodeOverlayDisplayBounds";

type NodeOverlayDisplayBoundsState = {
    revision: number;
    byEntityId: Record<string, NodeOverlayDisplayBounds>;
    upsert(bounds: NodeOverlayDisplayBounds): void;
    remove(entityId: string): void;
    reset(): void;
    read(entityId: string): NodeOverlayDisplayBounds | null;
};

const equalBounds = (
    left: NodeOverlayDisplayBounds | undefined,
    right: NodeOverlayDisplayBounds,
) =>
    left?.centerX === right.centerX &&
    left?.topY === right.topY &&
    left?.bottomY === right.bottomY;

export const useNodeOverlayDisplayBoundsStore =
    create<NodeOverlayDisplayBoundsState>()((set, get) => ({
        revision: 0,
        byEntityId: {},
        upsert: (bounds) =>
            set((state) => {
                if (equalBounds(state.byEntityId[bounds.entityId], bounds))
                    return state;
                return {
                    revision: state.revision + 1,
                    byEntityId: {
                        ...state.byEntityId,
                        [bounds.entityId]: bounds,
                    },
                };
            }),
        remove: (entityId) =>
            set((state) => {
                if (!(entityId in state.byEntityId)) return state;
                const { [entityId]: _removed, ...rest } = state.byEntityId;
                return { revision: state.revision + 1, byEntityId: rest };
            }),
        reset: () =>
            set((state) =>
                Object.keys(state.byEntityId).length === 0
                    ? state
                    : { revision: state.revision + 1, byEntityId: {} },
            ),
        read: (entityId) => get().byEntityId[entityId] ?? null,
    }));

export const publishNodeOverlayDisplayBounds = (
    bounds: NodeOverlayDisplayBounds,
): void => useNodeOverlayDisplayBoundsStore.getState().upsert(bounds);

export const removeNodeOverlayDisplayBounds = (entityId: string): void =>
    useNodeOverlayDisplayBoundsStore.getState().remove(entityId);

export const resetNodeOverlayDisplayBounds = (): void =>
    useNodeOverlayDisplayBoundsStore.getState().reset();

export const readNodeOverlayDisplayBounds = (
    entityId: string,
): NodeOverlayDisplayBounds | null =>
    useNodeOverlayDisplayBoundsStore.getState().read(entityId);
