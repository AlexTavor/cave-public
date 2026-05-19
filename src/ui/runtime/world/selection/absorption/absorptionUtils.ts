import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { readAssignedIds } from "../../../../../game/assignment/bodyAssignment";
import type { SortMode } from "./absorptionTypes";
import { matchesAssignmentFilters } from "../../../../../game/assignment/assignmentFilterUtils";

type AttributeTotals = { body: number; mind: number; social: number };

const resolveAttributes = (entity: RuntimeEntity): AttributeTotals => {
    const body = (entity as any).body ?? {};
    return (
        body.attributes ??
        body.baseAttributes ?? { body: 0, mind: 0, social: 0 }
    );
};

export const resolveBodyYield = (entity: RuntimeEntity): number => {
    const body = (entity as any).body ?? {};
    const level = Number.isFinite(body.level) ? body.level : 1;
    const attrs = resolveAttributes(entity);
    return level * 100 + (attrs.body + attrs.mind + attrs.social) * 10;
};

export const resolveDominantAttribute = (
    entity: RuntimeEntity,
): "body" | "mind" | "social" => {
    const attrs = resolveAttributes(entity);
    const entries = Object.entries(attrs) as [
        "body" | "mind" | "social",
        number,
    ][];
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0]?.[0] ?? "body";
};

export const resolveHealthRatio = (entity: RuntimeEntity): number => {
    const body = (entity as any).body ?? {};
    const current = typeof body.health === "number" ? body.health : 0;
    const max = typeof body.maxHealth === "number" ? body.maxHealth : 0;
    if (max <= 0) return 0;
    return current / max;
};

export const buildAssignedBodySet = (
    entities: ReadonlyArray<RuntimeEntity>,
): Set<string> => {
    const assigned = new Set<string>();
    for (const entity of entities) {
        const stateId = (entity as any).state?.assignedEntityId?.value;
        const assignmentId = (entity as any).assignment?.assignedIds?.[0];
        const candidate = typeof stateId === "string" ? stateId : assignmentId;
        if (typeof candidate === "string") assigned.add(candidate);
    }
    return assigned;
};

export const filterCandidates = (
    bodies: ReadonlyArray<RuntimeEntity>,
    stationEntity?: RuntimeEntity,
): RuntimeEntity[] =>
    bodies.filter((entity) => {
        const locked = (entity as any).state?.flag_locked?.value === true;
        const filter = (stationEntity as any)?.assignment?.filter;
        const assignedToStation = readAssignedIds(stationEntity).includes(
            entity.id ?? "",
        );
        return (
            !locked &&
            !assignedToStation &&
            matchesAssignmentFilters(entity, filter)
        );
    });

const sortByNumber = (a: number, b: number) => b - a;

export const sortBodies = (
    bodies: ReadonlyArray<RuntimeEntity>,
    mode: SortMode,
): RuntimeEntity[] => {
    const sorted = [...bodies];
    if (mode === "xp") {
        sorted.sort((a, b) =>
            sortByNumber(resolveBodyYield(a), resolveBodyYield(b)),
        );
        return sorted;
    }
    if (mode === "attributes") {
        sorted.sort((a, b) => {
            const aMax = Math.max(...Object.values(resolveAttributes(a)));
            const bMax = Math.max(...Object.values(resolveAttributes(b)));
            return sortByNumber(aMax, bMax);
        });
        return sorted;
    }
    sorted.sort((a, b) =>
        sortByNumber(resolveHealthRatio(a), resolveHealthRatio(b)),
    );
    return sorted;
};

