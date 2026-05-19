import type { WorldInteractionContextValue } from "../world/context/WorldInteractionContext";
import type { Runtime } from "../../../engine/runtime/Runtime";

export const createAmbientWorldContext = (
    runtime: Runtime | null,
): WorldInteractionContextValue => ({
    runtime,
    selectedEntityId: null,
    selectEntity: () => {},
    getCameraState: () => null,
    setCameraState: () => {},
    consumePendingCameraRestore: () => null,
    shouldRenderEntity: (entity) =>
        Array.isArray(entity.tags) &&
        entity.tags.includes("menu_ambient_agent"),
});
