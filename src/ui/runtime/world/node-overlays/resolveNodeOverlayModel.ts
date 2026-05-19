import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../engine/runtime/types";
import { resolveSelectionLens } from "../selection/selectionLensMap";
import type { ResolvedNodeOverlayEntry } from "./nodeOverlayTypes";
import {
    resolveAssignmentOverlayEntry,
    resolveCycleOverlayEntry,
    resolveStorageOverlayEntry,
} from "./resolveNodeOverlayModel.helpers";

const hasAssignmentOverlay = (entity: RuntimeEntity): boolean => {
    const assignedIds = (entity as { assignment?: { assignedIds?: unknown } })
        .assignment?.assignedIds;
    const state = (entity as { state?: Record<string, { value?: unknown }> })
        .state;
    return (
        Array.isArray(assignedIds) &&
        (assignedIds.length > 0 ||
            typeof state?.assignment_duration?.value === "number" ||
            typeof state?.absorption_duration?.value === "number")
    );
};

export const resolveNodeOverlayModel = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
    entityById?: Map<string, RuntimeEntity>,
    showValues = true,
): ResolvedNodeOverlayEntry | null => {
    const entityId = entity.id;
    const lens = resolveSelectionLens(entity, runtime);
    if (!entityId) return null;
    if (lens?.id === "resource")
        return resolveStorageOverlayEntry(
            entity,
            entityId,
            runtime,
            showValues,
        );
    if (hasAssignmentOverlay(entity)) {
        return resolveAssignmentOverlayEntry(entity, entityId, showValues);
    }
    if (lens?.id !== "job") return null;
    return resolveCycleOverlayEntry(
        entity,
        entityId,
        runtime,
        entityById,
        showValues,
    );
};
