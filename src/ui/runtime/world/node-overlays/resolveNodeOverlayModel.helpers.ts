import type { RuntimeEntity } from "../../../../engine/runtime/types";
import type { Runtime } from "../../../../engine/runtime/Runtime";
import { resolveStorageAbilityBars } from "../selection/ability-display/resolveStorageAbilityBars";
import type { ResolvedNodeOverlayEntry } from "./nodeOverlayTypes";
export { resolveCycleOverlayEntry } from "./resolveCycleOverlayEntry";

export const resolveStorageOverlayEntry = (
    entity: RuntimeEntity,
    entityId: string,
    runtime: Runtime | null,
    showValues: boolean,
): ResolvedNodeOverlayEntry | null => {
    const bar = resolveStorageAbilityBars(entity, runtime)[0];
    if (!bar) return null;
    const base = {
        entityId,
        kind: "storage" as const,
        label: "",
        bar: { ...bar, current: bar.current, max: bar.max },
    };
    if (!showValues) return base;
    return {
        ...base,
        valueBinding: {
            id: `node-overlay:text:storage:${entityId}`,
            entityId,
            kind: "compact-fraction",
            valuePath: bar.valuePath,
            ...(bar.maxPath
                ? { maxPath: bar.maxPath }
                : { maxValue: bar.maxValue ?? bar.max }),
        },
    };
};

export const resolveAssignmentOverlayEntry = (
    entity: RuntimeEntity,
    entityId: string,
    showValues: boolean,
): ResolvedNodeOverlayEntry | null => {
    const assignedIds = Array.isArray((entity as any).assignment?.assignedIds)
        ? (entity as any).assignment.assignedIds
        : [];
    if (assignedIds.length === 0) {
        return showValues
            ? { entityId, kind: "assignment", label: "Idle", valueText: "" }
            : { entityId, kind: "assignment", label: "Idle" };
    }
    return null;
};
