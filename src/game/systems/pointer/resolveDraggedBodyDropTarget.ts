import type { Snapshot } from "../../../engine/runtime/Snapshot";
import { isBodyEntity, readStateNumber } from "../../assignment/bodyAssignment";
import { canAssignBodyToOwner } from "../../assignment/assignmentAcceptance";
import { resolveNearestTarget } from "./pointerResolvers";
import { collectPointerTargets } from "./pointerState";

const POINTER_RADIUS_FALLBACK = 180;

export type DraggedBodyDropTargetResult =
    | { valid: true; ownerId: string; kind: "power" | "processing" }
    | {
          valid: false;
          reason:
              | "missing_body"
              | "no_target"
              | "missing_target"
              | "filter_mismatch"
              | "slots_full";
      };

export const resolveDraggedBodyDropTarget = (
    snapshot: Snapshot,
    bodyId: string,
    pointerX: number,
    pointerY: number,
): DraggedBodyDropTargetResult => {
    const body = snapshot.getEntity(bodyId);
    if (!isBodyEntity(body as any)) {
        return { valid: false, reason: "missing_body" };
    }
    const pointer = snapshot.getEntity("sys_pointer");
    const target = resolveNearestTarget({
        targets: collectPointerTargets(snapshot),
        pointerX,
        pointerY,
        radius:
            readStateNumber(pointer as any, "pointer_connection_radius") ||
            POINTER_RADIUS_FALLBACK,
    });
    if (!target) return { valid: false, reason: "no_target" };
    const owner = snapshot.getEntity(target.id);
    if (!owner) return { valid: false, reason: "missing_target" };
    const acceptance = canAssignBodyToOwner({
        body: body as any,
        owner: owner as any,
        ignoreBodyId: bodyId,
    });
    if (!acceptance.allowed) {
        return {
            valid: false,
            reason:
                acceptance.reason === "slots_full"
                    ? "slots_full"
                    : "filter_mismatch",
        };
    }
    return { valid: true, ownerId: target.id, kind: target.kind as any };
};
