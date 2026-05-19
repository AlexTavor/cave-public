import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { SerializedCameraState } from "../../../../engine/runtime/persistence/types";
import { WorldInteractionContext } from "../../../runtime/world/context/WorldInteractionContext";

export interface LayoutWorldAdapterProps {
    runtime: Runtime | null;
    children: React.ReactNode;
}

export const LayoutWorldAdapter: React.FC<LayoutWorldAdapterProps> = ({
    runtime,
    children,
}) => {
    const [selectedEntityId, setSelectedEntityId] = useState<string | null>(
        null,
    );
    const cameraRef = useRef<SerializedCameraState | null>(null);

    useEffect(() => {
        setSelectedEntityId(null);
    }, [runtime]);

    const selectEntity = useCallback((id: string | null) => {
        setSelectedEntityId(id);
    }, []);

    const getCameraState = useCallback(() => cameraRef.current, []);
    const setCameraState = useCallback((state: SerializedCameraState) => {
        cameraRef.current = state;
    }, []);
    const consumePendingCameraRestore = useCallback(
        () => null as SerializedCameraState | null,
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
        }),
        [
            runtime,
            selectedEntityId,
            selectEntity,
            getCameraState,
            setCameraState,
            consumePendingCameraRestore,
        ],
    );

    return (
        <WorldInteractionContext.Provider value={value}>
            {children}
        </WorldInteractionContext.Provider>
    );
};
