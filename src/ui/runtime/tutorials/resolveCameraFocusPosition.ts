import { resolveBodyPhysicsPosition } from "../../../engine/phaser/visuals/distressTarget";
import { resolveBodySelectionTargetId } from "../world/selection/selectionUtils";

export const resolveCameraFocusPosition = (runtime: any, focusId: string) => {
    const entity = runtime?.getEntity?.(focusId);
    const body = runtime?.getPhysicsBody?.(focusId);
    if (body) {
        return { x: body.position?.x ?? body.x, y: body.position?.y ?? body.y };
    }
    const bodyTargetId = entity
        ? resolveBodySelectionTargetId(entity)
        : undefined;
    if (bodyTargetId) return resolveBodyPhysicsPosition(runtime, bodyTargetId);
    return null;
};
