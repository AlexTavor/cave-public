import type { Snapshot } from "../../engine/runtime/Snapshot";
import type { RuntimeEntity } from "../../engine/runtime/types";

export const collectPoolExcludedBodyIds = (snapshot: Snapshot): Set<string> => {
    const excluded = new Set<string>();
    for (const entity of snapshot.getEntities()) {
        if (entity.id === "sys_world") continue;
        const assignedIds = (
            entity as { assignment?: { assignedIds?: string[] } }
        ).assignment?.assignedIds;
        for (const assignedId of assignedIds ?? []) {
            if (typeof assignedId === "string") excluded.add(assignedId);
        }
    }
    return excluded;
};

export const isPoolContributingBody = (
    entity: RuntimeEntity,
    excludedIds?: Set<string>,
): boolean => {
    if (!(entity as { body?: unknown }).body || !entity.id) return false;
    if (entity.id === "sys_world") return false;

    const tags = (entity as { tags?: string[] }).tags ?? [];
    if (tags.includes("aggregate")) return false;

    const state = (entity as { state?: Record<string, { value?: unknown }> })
        .state;
    if (state?.flag_locked?.value === true) return false;
    return !excludedIds?.has(entity.id);
};
