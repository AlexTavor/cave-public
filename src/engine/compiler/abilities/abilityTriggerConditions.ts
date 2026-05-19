import type { BehaviorRule } from "../../../data/schemas/behavior";
import type { AbilityTriggerKind } from "../../../data/schemas/abilities/triggers";
import { cycleCompleteConditions } from "./cycleConditions";

type Condition = BehaviorRule["conditions"][number];

const assignmentCompleteCondition = (): Condition => ({
    id: "assignment_complete",
    sortKey: "0",
    tokens: [],
    compiled: {
        ">": [{ var: "self.state.assignment_complete_pulse.value" }, 0],
    },
});

const combinedTriggerCondition = (): Condition => ({
    id: "cycle_or_assignment_complete",
    sortKey: "0",
    tokens: [],
    compiled: {
        or: [
            {
                and: [
                    {
                        ">=": [
                            { var: "self.state.cycle.value" },
                            { var: "self.state.cycle.max" },
                        ],
                    },
                    { ">": [{ var: "self.state.cycle.max" }, 0] },
                ],
            },
            { ">": [{ var: "self.state.assignment_complete_pulse.value" }, 0] },
        ],
    },
});

export const buildAbilityTriggerConditions = (
    triggers: AbilityTriggerKind[],
): BehaviorRule["conditions"] => {
    const hasCycle = triggers.includes("cycle_complete");
    const hasAssignment = triggers.includes("assignment_complete");
    if (hasCycle && hasAssignment) return [combinedTriggerCondition()];
    if (hasAssignment) return [assignmentCompleteCondition()];
    return cycleCompleteConditions();
};
