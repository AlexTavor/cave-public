import type { RuntimeEntity } from "../../engine/runtime/types";
import type { AssignmentFilterRule } from "../../data/schemas/assignmentRules";

const resolveHabitiIds = (entity: RuntimeEntity): Set<string> =>
    new Set(
        (
            (entity as { body?: { habiti?: string[] } }).body?.habiti ?? []
        ).filter((id): id is string => typeof id === "string"),
    );

const resolveTraitIds = (entity: RuntimeEntity): Set<string> => {
    const bodyTraits =
        (entity as { body?: { traits?: string[] } }).body?.traits ?? [];
    const componentTraits = Array.isArray(
        (entity as { traits?: unknown }).traits,
    )
        ? ((entity as { traits?: Array<{ id?: string }> }).traits ?? [])
              .map((entry) => entry.id)
              .filter((id): id is string => typeof id === "string")
        : [];
    return new Set([...bodyTraits, ...componentTraits]);
};

export const matchesAssignmentFilters = (
    entity: RuntimeEntity,
    filters: AssignmentFilterRule[] = [],
): boolean => {
    const habitusIds = resolveHabitiIds(entity);
    const traitIds = resolveTraitIds(entity);
    return filters.every((rule) =>
        rule.kind === "required_habiti_all"
            ? rule.ids.every((id) => habitusIds.has(id))
            : rule.ids.every((id) => traitIds.has(id)),
    );
};
