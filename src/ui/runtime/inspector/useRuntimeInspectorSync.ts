import { useEffect } from "react";
import { useRuntimeToolStore } from "../state/useRuntimeToolStore";
import { useWorldInteraction } from "../world/context/WorldInteractionContext";
import { runtimeInspectorStore } from "./runtimeInspectorStore";
import { useRuntimeInspectorEnabled } from "./useRuntimeInspectorEnabled";

export const useRuntimeInspectorSync = (): void => {
    const enabled = useRuntimeInspectorEnabled();
    const { runtime } = useWorldInteraction();
    const selectedEntityId = useRuntimeToolStore(
        (state) => state.selectedEntityId,
    );

    useEffect(() => {
        if (!enabled || runtime === null) {
            runtimeInspectorStore.getState().reset();
            return;
        }
        runtimeInspectorStore.getState().syncSelection(selectedEntityId);
    }, [enabled, runtime, selectedEntityId]);
};
