import type { Blueprint } from "../../../data/schemas/blueprint";

const RULE_ID = "sys_assignment_complete_reset";

export const prepareAssignmentCompletionTrigger = (draft: Blueprint): void => {
    draft.components ??= {} as Blueprint["components"];
    draft.components.state ??= {};
    draft.components.state.assignment_complete_pulse = {
        value: 0,
        visible: false,
    };
    draft.components.behavior ??= { rules: [] };
    draft.components.behavior.rules ??= [];
    const rules = draft.components.behavior.rules.filter(
        (rule) => rule.id !== RULE_ID,
    );
    rules.push({
        id: RULE_ID,
        sortKey: "sys_999",
        conditions: [
            {
                id: "assignment_complete_pulse_active",
                sortKey: "0",
                tokens: [],
                compiled: {
                    ">": [
                        { var: "self.state.assignment_complete_pulse.value" },
                        0,
                    ],
                },
            },
        ],
        actions: [
            {
                type: "MUTATE",
                target: "self.state.assignment_complete_pulse.value",
                op: "SET",
                value: 0,
            },
        ],
    });
    draft.components.behavior.rules = rules;
};
