import { createContext, useContext } from "react";
import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { SerializedCameraState } from "../../../../engine/runtime/persistence/types";
import type { RuntimeEntity } from "../../../../engine/runtime/types";
import type { RuntimeVisualEvent } from "../../../../engine/runtime/runtimeVisualEvents";

export interface WorldInteractionContextValue {
    runtime: Runtime | null;
    selectedEntityId: string | null;
    selectEntity: (id: string | null) => void;
    getCameraState: () => SerializedCameraState | null;
    setCameraState: (state: SerializedCameraState) => void;
    consumePendingCameraRestore: () => SerializedCameraState | null;
    consumeRuntimeVisualEffects?: () => RuntimeVisualEvent[];
    shouldRenderEntity?: (entity: RuntimeEntity) => boolean;
    rendererPreference?: "auto" | "canvas";
}

export const WorldInteractionContext =
    createContext<WorldInteractionContextValue | null>(null);

export const useWorldInteraction = (): WorldInteractionContextValue => {
    const ctx = useContext(WorldInteractionContext);
    if (!ctx) {
        throw new Error(
            "useWorldInteraction must be used within a WorldInteractionProvider",
        );
    }

    return ctx;
};

