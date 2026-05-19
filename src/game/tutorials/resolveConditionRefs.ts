import type { ConditionDefinition } from "../../data/schemas/conditions";

export const resolveConditionRefs = (
    conditionIndex: Map<string, ConditionDefinition>,
    ids: string[] = [],
) => {
    const resolved: ConditionDefinition[] = [];
    const missing: string[] = [];
    ids.forEach((id) => {
        const condition = conditionIndex.get(id);
        if (condition) resolved.push(condition);
        else missing.push(id);
    });
    return { resolved, missing };
};
