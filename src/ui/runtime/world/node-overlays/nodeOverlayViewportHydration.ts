import type { SerializedCameraState } from "../../../../engine/runtime/persistence/types";
import type { Runtime } from "../../../../engine/runtime/Runtime";
import { resolveNodeOverlayEntries } from "./resolveNodeOverlayEntries";
import { resolveNodeOverlayModel } from "./resolveNodeOverlayModel";
import { nodeOverlayEntryEqual } from "./nodeOverlayViewportDataEqual";
import {
    EMPTY_OVERLAY_VIEWPORT_DATA,
    resolveOverlayViewportData,
} from "./resolveOverlayViewportData";
import type { ResolvedNodeOverlayEntry } from "./nodeOverlayTypes";
import type { RuntimeCalloutItem } from "./runtime-callouts/runtimeCalloutTypes";
export type NodeOverlayEntryIndex = {
    byId: Map<string, ResolvedNodeOverlayEntry>;
    entries: ResolvedNodeOverlayEntry[];
    entityById: Map<string, any>;
};
const syncEntries = (index: NodeOverlayEntryIndex) =>
    (index.entries = [...index.byId.values()].sort((left, right) =>
        left.entityId.localeCompare(right.entityId),
    ));

export const buildNodeOverlayEntryIndex = (
    runtime: Runtime,
    showValues: boolean,
): NodeOverlayEntryIndex => {
    const entityById = new Map(
        runtime
            .getEntities()
            .map((entity) => [entity.id ?? "", entity] as const),
    );
    const entries = resolveNodeOverlayEntries(runtime, entityById, showValues);
    return {
        byId: new Map(entries.map((entry) => [entry.entityId, entry])),
        entries,
        entityById,
    };
};
export const applyNodeOverlayEntryChanges = (
    index: NodeOverlayEntryIndex,
    runtime: Runtime,
    changedEntityIds: string[],
    showValues: boolean,
) => {
    let changed = false;
    changedEntityIds.forEach((entityId) => {
        const previous = index.byId.get(entityId);
        const entity = runtime.getEntity(entityId);
        if (entity) index.entityById.set(entityId, entity);
        else index.entityById.delete(entityId);
        const next = entity
            ? resolveNodeOverlayModel(
                  entity,
                  runtime,
                  index.entityById,
                  showValues,
              )
            : null;
        if (!next) {
            if (!previous) return;
            index.byId.delete(entityId);
            changed = true;
            return;
        }
        if (!previous) {
            index.byId.set(entityId, next);
            changed = true;
            return;
        }
        if (nodeOverlayEntryEqual(previous, next)) return;
        index.byId.set(entityId, next);
        changed = true;
    });
    if (changed) syncEntries(index);
    return changed;
};
export const resolveNodeOverlayViewportData = (
    runtime: Runtime,
    cameraState: SerializedCameraState | null,
    width: number,
    height: number,
    runtimeCalloutItems: RuntimeCalloutItem[],
    nodeEntries: ResolvedNodeOverlayEntry[],
) =>
    width <= 0 || height <= 0
        ? EMPTY_OVERLAY_VIEWPORT_DATA
        : resolveOverlayViewportData(
              runtime,
              cameraState,
              width,
              height,
              runtimeCalloutItems,
              nodeEntries,
          );
