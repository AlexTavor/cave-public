import type { RuntimeEntity } from "../../engine/runtime/types";
import { readAssignmentDuration } from "./bodyAssignment";

export const readAssignmentDurationMs = (
    entity: RuntimeEntity | undefined,
): number => Math.max(0, readAssignmentDuration(entity) * 1000);
