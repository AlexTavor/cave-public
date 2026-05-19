import type { RuntimeEntity } from "../../engine/runtime/types";
import { matchesAssignmentFilters } from "./assignmentFilterUtils";
import { readAssignedIds } from "./bodyAssignment";

export const readAssignmentSlotLimit = (owner: RuntimeEntity): number => {
    const slots = (owner as { assignment?: { slots?: unknown } }).assignment
        ?.slots;
    return typeof slots === "number" && slots > 0
        ? slots
        : Number.POSITIVE_INFINITY;
};

export const resolveRemainingAssignmentSlots = (input: {
    owner: RuntimeEntity;
    ignoreBodyId?: string;
}): number => {
    const limit = readAssignmentSlotLimit(input.owner);
    if (!Number.isFinite(limit)) return Number.POSITIVE_INFINITY;
    const assignedCount = readAssignedIds(input.owner).filter(
        (id) => id !== input.ignoreBodyId,
    ).length;
    return Math.max(0, limit - assignedCount);
};

export const canAssignBodyToOwner = (input: {
    body: RuntimeEntity;
    owner: RuntimeEntity;
    ignoreBodyId?: string;
}): { allowed: boolean; reason: "ok" | "filter_mismatch" | "slots_full" } => {
    const filter = (input.owner as { assignment?: { filter?: unknown[] } })
        .assignment?.filter;
    if (!matchesAssignmentFilters(input.body, filter as any)) {
        return { allowed: false, reason: "filter_mismatch" };
    }
    if (resolveRemainingAssignmentSlots(input) <= 0) {
        return { allowed: false, reason: "slots_full" };
    }
    return { allowed: true, reason: "ok" };
};

export const filterAssignableBodies = (input: {
    bodies: RuntimeEntity[];
    owner: RuntimeEntity;
}) =>
    input.bodies.filter(
        (body) => canAssignBodyToOwner({ body, owner: input.owner }).allowed,
    );
