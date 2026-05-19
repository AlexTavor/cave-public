import type { Snapshot } from "../../engine/runtime/Snapshot";
import { readAssignedIds } from "./bodyAssignment";

export const evaluateBodyInPointer = (snapshot: Snapshot): boolean =>
    readAssignedIds(snapshot.getEntity("sys_pointer") as any).length > 0;
