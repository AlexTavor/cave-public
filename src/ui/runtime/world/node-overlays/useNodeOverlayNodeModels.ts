import { useRef, type RefObject } from "react";
import { useElementSize } from "../../../lib/foundation/layout/useElementSize";
import { useRuntimeStore } from "../../state/useRuntimeStore";
import { useWorldInteraction } from "../context/WorldInteractionContext";
import { nodeOverlayModelEqual } from "./nodeOverlayComparators";
import { projectNodeOverlayModels } from "./overlayViewportModels";
import type { ResolvedNodeOverlayModel } from "./nodeOverlayTypes";
import { useResolvedNodeOverlayEntries } from "./useResolvedNodeOverlayEntries";
import { useScopedNodeOverlayDisplayBounds } from "./useScopedNodeOverlayDisplayBounds";

type ModelCache = {
    runtime: object;
    entries: object;
    width: number;
    height: number;
    cameraRevision: number;
    displayBounds: readonly unknown[];
    models: ResolvedNodeOverlayModel[];
};

const EMPTY_NODE_MODELS: ResolvedNodeOverlayModel[] = [];

export const useNodeOverlayNodeModels = (
    rootRef: RefObject<HTMLElement | null>,
    enabled: boolean,
    showValues = true,
): ResolvedNodeOverlayModel[] => {
    const { runtime, getCameraState } = useWorldInteraction();
    const cameraRevision = useRuntimeStore((state) => state.cameraRevision);
    const nodeEntries = useResolvedNodeOverlayEntries(
        runtime,
        enabled,
        showValues,
    );
    const displayBounds = useScopedNodeOverlayDisplayBounds(
        nodeEntries.map((entry) => entry.entityId),
    );
    const [width, height] = useElementSize(rootRef);
    const viewportWidth = width || rootRef.current?.clientWidth || 0;
    const viewportHeight = height || rootRef.current?.clientHeight || 0;
    const cacheRef = useRef<ModelCache | null>(null);
    if (!runtime || !enabled || viewportWidth <= 0 || viewportHeight <= 0) {
        cacheRef.current = null;
        return EMPTY_NODE_MODELS;
    }
    const cached = cacheRef.current;
    if (
        cached?.runtime === runtime &&
        cached.entries === nodeEntries &&
        cached.width === viewportWidth &&
        cached.height === viewportHeight &&
        cached.cameraRevision === cameraRevision &&
        cached.displayBounds === displayBounds
    ) {
        return cached.models;
    }
    const nextModels = projectNodeOverlayModels(
        runtime,
        getCameraState(),
        viewportWidth,
        viewportHeight,
        nodeEntries,
        displayBounds,
    );
    const cachedModels = cached?.models;
    const models =
        cachedModels?.length === nextModels.length &&
        cachedModels.every((model, index) =>
            nodeOverlayModelEqual(model, nextModels[index]),
        )
            ? cachedModels
            : nextModels;
    cacheRef.current = {
        runtime,
        entries: nodeEntries,
        width: viewportWidth,
        height: viewportHeight,
        cameraRevision,
        displayBounds,
        models,
    };
    return models;
};
