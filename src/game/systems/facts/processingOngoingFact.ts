import type { Snapshot } from "../../../engine/runtime/Snapshot";
import { getFactValue } from "../../facts/factUtils";

const FACT_ABOUT = "world";

const isProcessingOngoing = (entity: Readonly<Record<string, any>>) =>
    entity.state?.processing_absorbs_habiti?.value === true &&
    Array.isArray(entity.assignment?.assignedIds) &&
    entity.assignment.assignedIds.length > 0;

export const resolveProcessingOngoingFactDelta = (
    snapshot: Snapshot,
): number => {
    const world = snapshot.getEntity("sys_world");
    if (!world) return 0;
    const current = snapshot
        .getEntities()
        .some((entity) => isProcessingOngoing(entity as Record<string, any>))
        ? 1
        : 0;
    const previous = getFactValue(world, "run", "processing_ongoing", FACT_ABOUT);
    return current - previous;
};

export const PROCESSING_ONGOING_FACT_ABOUT = FACT_ABOUT;