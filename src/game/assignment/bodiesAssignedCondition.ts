import type { Snapshot } from "../../engine/runtime/Snapshot";
import { readAssignedIds } from "./bodyAssignment";

export const evaluateBodiesAssigned = (
    snapshot: Snapshot,
    selfId: string,
): boolean => readAssignedIds(snapshot.getEntity(selfId) as any).length > 0;
