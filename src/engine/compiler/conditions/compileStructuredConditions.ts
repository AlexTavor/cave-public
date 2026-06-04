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

// Deterministic id/sortKey. These rules are always consumed as a *condition*
// (their `.compiled` expression is evaluated; the id/sortKey never drive ordering
// or keying), so a stable key derived from the condition is enough — and required:
// nanoid()/ulid() made the compiled output non-reproducible, breaking the compiler
// contract (and the engine determinism gate). See constraints/state/determinism.md.
const createRule = (compiled: unknown, key: string): LogicRule => ({
    id: key,
    sortKey: key,
    tokens: [],
    compiled,
});

export const compileStructuredConditions = (
    conditions: StructuredConditionInput[],
): LogicRule[] =>
    conditions.map((condition, index) =>
        createRule(
            toCompiledExpression(condition),
            `structured_${condition.kind}_${index}`,
        ),
    );

export const compileStructuredConditionAllGate = (
    conditions: StructuredConditionInput[],
): LogicRule | null => {
    if (conditions.length === 0) return null;
    const compiled = conditions.map(toCompiledExpression);
    return createRule(
        compiled.length === 1 ? compiled[0] : { and: compiled },
        "structured_all_gate",
    );
};

export const compileStructuredConditionNotAllGate = (
    conditions: StructuredConditionInput[],
): LogicRule | null => {
    const allGate = compileStructuredConditionAllGate(conditions);
    return allGate
        ? createRule({ "!": [allGate.compiled] }, "structured_not_all_gate")
        : null;
};
