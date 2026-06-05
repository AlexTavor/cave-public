import { RuntimeCommandType } from "../../runtime/types";
import type { Runtime } from "../../runtime/Runtime";
import type { AssignBodiesBatchUpdate } from "../../runtime/types/runtimeCommandAssignBodies";
import type { Snapshot } from "../../runtime/Snapshot";

// The drop-target resolver is game-domain (assignment acceptance rules); the
// phaser drag controller calls it through this injected hook (provided by the
// ui bridge, usePhaserGame) so engine/phaser doesn't import game.
export type ResolveDraggedBodyDropTarget = (
    snapshot: Snapshot,
    bodyId: string,
    pointerX: number,
    pointerY: number,
) => { valid: true; ownerId: string } | { valid: false };

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
    pointer: { worldX: number; worldY: number } | undefined,
    resolveDropTarget: ResolveDraggedBodyDropTarget,
): AssignBodiesBatchUpdate => {
    const release = pointer
        ? { x: pointer.worldX, y: pointer.worldY }
        : runtime.getPhysicsBody("sys_pointer");
    const target = release
        ? resolveDropTarget(
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
