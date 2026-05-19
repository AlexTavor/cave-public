import type { BehaviorRule } from "../../../data/schemas/behavior";

type Condition = BehaviorRule["conditions"][number];

/**
 * Returns the two conditions required for a cycle to be considered "complete":
 * 1. cycle.value >= cycle.max
 * 2. cycle.max > 0  (prevents false completion when population drops max to 0)
 */
export const cycleCompleteConditions = (): [Condition, Condition] => [
    {
        id: "cycle_complete",
        sortKey: "0",
        tokens: [
            { t: "ref", v: "self.state.cycle.value" },
            { t: "op", v: ">=" },
            { t: "ref", v: "self.state.cycle.max" },
        ],
    },
    {
        id: "cycle_has_max",
        sortKey: "1",
        tokens: [
            { t: "ref", v: "self.state.cycle.max" },
            { t: "op", v: ">" },
            { t: "val", v: 0 },
        ],
    },
];
