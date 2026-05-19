import { RuntimeCommandType } from "../../runtime/types";
import type { Runtime } from "../../runtime/Runtime";
import type { AssignBodiesBatchUpdate } from "../../runtime/types/runtimeCommandAssignBodies";
import { resolveDraggedBodyDropTarget } from "../../../game/systems/pointer/resolveDraggedBodyDropTarget";

export const enqueueDragAssignment = (
    runtime: Runtime,
    update: AssignBodiesBatchUpdate,
) =>
    runtime.commands.enqueue({
        type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
        payload: { updates: [update] },
    });

export const resolveDragReleaseUpdate = (
    runtime: Runtime,
    drag: { id: string; originOwnerId: string },
    pointer?: { worldX: number; worldY: number },
): AssignBodiesBatchUpdate => {
    const release = pointer
        ? { x: pointer.worldX, y: pointer.worldY }
        : runtime.getPhysicsBody("sys_pointer");
    const target = release
        ? resolveDraggedBodyDropTarget(
              runtime.createSnapshot(),
              drag.id,
              release.x,
              release.y,
          )
        : { valid: false as const };
    return target.valid
        ? { bodyId: drag.id, ownerId: target.ownerId }
        : {
              bodyId: drag.id,
              ownerId: drag.originOwnerId,
              mode: "drag_restore",
              expectedCurrentOwnerId: "sys_pointer",
          };
};
