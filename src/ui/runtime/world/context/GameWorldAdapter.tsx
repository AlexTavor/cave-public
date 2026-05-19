import React, { useCallback, useMemo } from "react";
import { useRuntimeStore } from "../../state/useRuntimeStore";
import { useRuntimeToolStore } from "../../state/useRuntimeToolStore";
import { WorldInteractionContext } from "./WorldInteractionContext";
import { useSyncRuntimeSelection } from "./useSyncRuntimeSelection";
import { runtimeVisualEffectsStore } from "../../effects/runtimeVisualEffectsStore";

export interface GameWorldAdapterProps {
    children: React.ReactNode;
}

export const GameWorldAdapter: React.FC<GameWorldAdapterProps> = ({
    children,
}) => {
    const runtime = useRuntimeStore((state) => state.runtime);
    const selectedEntityId = useRuntimeToolStore(
        (state) => state.selectedEntityId,
    );
    const selectEntity = useRuntimeToolStore((state) => state.selectEntity);
    useSyncRuntimeSelection(runtime, selectedEntityId);

    const getCameraState = useCallback(
        () => useRuntimeStore.getState().cameraState,
        [],
    );
    const setCameraState = useRuntimeStore((s) => s.setCameraState);
    const consumePendingCameraRestore = useCallback(
        () => useRuntimeStore.getState().consumePendingCameraRestore(),
        [],
    );
    const consumeRuntimeVisualEffects = useCallback(
        () => runtimeVisualEffectsStore.consumeAll(),
        [],
    );

    const value = useMemo(
        () => ({
            runtime,
            selectedEntityId,
            selectEntity,
            getCameraState,
            setCameraState,
            consumePendingCameraRestore,
            consumeRuntimeVisualEffects,
            shouldRenderEntity: undefined,
        }),
        [
            runtime,
            selectedEntityId,
            selectEntity,
            getCameraState,
            setCameraState,
            consumePendingCameraRestore,
            consumeRuntimeVisualEffects,
        ],
    );

    return (
        <WorldInteractionContext.Provider value={value}>
            {children}
        </WorldInteractionContext.Provider>
    );
};

