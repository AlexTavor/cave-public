import { nanoid } from "nanoid";
import { ulid } from "ulid";
import type { LogicRule } from "../../../data/schemas/logic";
import type { StructuredConditionInput } from "../../../data/schemas/conditions";

const toRefPath = (condition: StructuredConditionInput) => {
    switch (condition.kind) {
        case "fact_threshold":
            if (
                condition.factType === "throttle_level" &&
                condition.factAbout === "self"
            ) {
                return "self.powerSink.throttle";
            }
            if (condition.factType === "cave_status") {
                return `sys_world.state.${condition.factAbout}.value`;
            }
            return `sys_world.${condition.scope}.${condition.factType}.${condition.factAbout}`;
        case "world_state_threshold":
        case "world_state_boolean":
            return `sys_world.state.${condition.key}.value`;
        case "user_interaction":
            return "self.id";
    }
};

const toCompiledExpression = (condition: StructuredConditionInput) => {
    switch (condition.kind) {
        case "carriers_orbiting":
            return { CARRIERS_ORBITING: [] };
        case "body_in_pointer":
            return { BODY_IN_POINTER: [] };
        case "bodies_assigned":
            return { BODIES_ASSIGNED: [] };
        case "destructive_assignment_has_all_bodies":
            return { DESTRUCTIVE_ASSIGNMENT_HAS_ALL_BODIES: [] };
        case "entity_tag_present":
            return { ">=": [{ QUERY_COUNT: [condition.tag] }, 1] };
        case "world_state_boolean":
            return { "==": [{ var: toRefPath(condition) }, condition.value] };
        case "user_interaction":
            return {
                [condition.interaction === "self_selected" ? "==" : "!="]: [
                    { var: toRefPath(condition) },
                    { var: "sys_world.state.cave_selected_entity_id.value" },
                ],
            };
        case "fact_threshold":
        case "world_state_threshold":
            return {
                [condition.operator]: [
                    { var: toRefPath(condition) },
                    condition.value,
                ],
            };
    }
};

const createRule = (compiled: unknown): LogicRule => ({
    id: nanoid(),
    sortKey: ulid(),
    tokens: [],
    compiled,
});

export const compileStructuredConditions = (
    conditions: StructuredConditionInput[],
): LogicRule[] =>
    conditions.map((condition) => createRule(toCompiledExpression(condition)));

export const compileStructuredConditionAllGate = (
    conditions: StructuredConditionInput[],
): LogicRule | null => {
    if (conditions.length === 0) return null;
    const compiled = conditions.map(toCompiledExpression);
    return createRule(compiled.length === 1 ? compiled[0] : { and: compiled });
};

export const compileStructuredConditionNotAllGate = (
    conditions: StructuredConditionInput[],
): LogicRule | null => {
    const allGate = compileStructuredConditionAllGate(conditions);
    return allGate ? createRule({ "!": [allGate.compiled] }) : null;
};
