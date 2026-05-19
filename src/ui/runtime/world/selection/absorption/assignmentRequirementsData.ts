import type {
    AssignmentFilterRule,
    AssignmentMinimumRule,
} from "../../../../../data/schemas/assignmentRules";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { buildAssignmentMinimumProgress } from "../../../../../game/assignment/assignmentMinimums";

const buildFilterLabel = (rule: AssignmentFilterRule): string =>
    rule.kind === "required_habiti_all"
        ? `Requires habiti: ${rule.ids.join(", ")}`
        : `Requires traits: ${rule.ids.join(", ")}`;

const readAssignment = (entity: RuntimeEntity | undefined) =>
    (
        entity as {
            assignment?: {
                filter?: AssignmentFilterRule[];
                minimums?: AssignmentMinimumRule[];
            };
        }
    )?.assignment;

export const resolveAssignmentRequirementsData = (
    entity: RuntimeEntity | undefined,
    assignedIds: string[],
    getEntity: (id: string) => RuntimeEntity | undefined,
) => {
    const assignment = readAssignment(entity);
    const filters = assignment?.filter ?? [];
    const minimums = assignment?.minimums ?? [];
    return {
        filterLabels: filters.map(buildFilterLabel),
        minimumRows: buildAssignmentMinimumProgress(
            getEntity,
            assignedIds,
            minimums,
        ),
    };
};
