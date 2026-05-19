import type { AssignmentMinimumRule } from "../../data/schemas/assignmentRules";
import type { RuntimeEntity } from "../../engine/runtime/types";

export type AssignmentMinimumProgress = {
    label: string;
    current: number;
    required: number;
    satisfied: boolean;
};

type EntityResolver = (id: string) => RuntimeEntity | undefined;

const resolveAttributes = (entity: RuntimeEntity | undefined) => {
    const body = (entity as { body?: any })?.body;
    return (
        body?.attributes ??
        body?.baseAttributes ?? { body: 0, mind: 0, social: 0 }
    );
};

const resolveLevel = (entity: RuntimeEntity | undefined): number => {
    const level = (entity as { body?: { level?: unknown } })?.body?.level;
    return typeof level === "number" ? level : 0;
};

const resolveMinimumLabel = (rule: AssignmentMinimumRule): string => {
    if (rule.kind === "body_count") return "Assigned bodies";
    return rule.kind === "level_total"
        ? "Total level"
        : `Total ${rule.attribute}`;
};

const resolveMinimumCurrent = (
    rule: AssignmentMinimumRule,
    bodies: RuntimeEntity[],
): number => {
    if (rule.kind === "body_count") return bodies.length;
    if (rule.kind === "level_total") {
        return bodies.reduce((sum, entity) => sum + resolveLevel(entity), 0);
    }
    return bodies.reduce(
        (sum, entity) => sum + resolveAttributes(entity)[rule.attribute],
        0,
    );
};

const resolveAssignedBodies = (
    getEntity: EntityResolver,
    assignedIds: string[],
): RuntimeEntity[] =>
    assignedIds
        .map((id) => getEntity(id))
        .filter((entity): entity is RuntimeEntity => Boolean(entity));

export const buildAssignmentMinimumProgress = (
    getEntity: EntityResolver,
    assignedIds: string[],
    minimums: AssignmentMinimumRule[] = [],
): AssignmentMinimumProgress[] => {
    const bodies = resolveAssignedBodies(getEntity, assignedIds);
    return minimums.map((rule) => {
        const current = resolveMinimumCurrent(rule, bodies);
        return {
            label: resolveMinimumLabel(rule),
            current,
            required: rule.required,
            satisfied: current >= rule.required,
        };
    });
};

export const satisfiesAssignmentMinimums = (
    getEntity: EntityResolver,
    assignedIds: string[],
    minimums: AssignmentMinimumRule[] = [],
): boolean =>
    buildAssignmentMinimumProgress(getEntity, assignedIds, minimums).every(
        (row) => row.satisfied,
    );
