import type { SerializedCameraState } from "../../../engine/runtime/persistence/types";
import type { WorldInteractionContextValue } from "../world/context/WorldInteractionContext";
import { runtimeNotificationStore } from "./runtimeNotificationStore";
import type { RuntimeEventItem } from "./runtimeNotificationTypes";

const DEFAULT_FOCUS_ZOOM = 1;

const resolveFocusCamera = (
    world: WorldInteractionContextValue,
    entityId: string,
): SerializedCameraState | null => {
    const body = world.runtime?.getPhysicsBody(entityId);
    if (!body) return null;
    return {
        centerX: body.position.x,
        centerY: body.position.y,
        zoom: world.getCameraState()?.zoom ?? DEFAULT_FOCUS_ZOOM,
    };
};

export const handleRuntimeEventClick = (
    item: RuntimeEventItem,
    world: WorldInteractionContextValue,
) => {
    if (item.entityId && world.runtime?.getEntity(item.entityId)) {
        world.selectEntity(item.entityId);
        const camera = resolveFocusCamera(world, item.entityId);
        if (camera) world.setCameraState(camera);
    }
    runtimeNotificationStore.getState().dismissEvent(item.aggregationKey);
};
