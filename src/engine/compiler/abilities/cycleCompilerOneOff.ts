import type { EditorAbilities } from "../../../data/schemas/abilities";
import type { BehaviorRule } from "../../../data/schemas/behavior";

export const createCycleGcRule = (
    storage: EditorAbilities["storage"],
): BehaviorRule => {
    const resources = Array.from(
        new Set(
            (storage ?? [])
                .map((entry) => entry.resource?.trim())
                .filter((value): value is string => Boolean(value)),
        ),
    );

    const conditions: BehaviorRule["conditions"] = [
        {
            id: "is_depleted",
            sortKey: "0",
            tokens: [
                { t: "ref", v: "self.state.is_depleted.value" },
                { t: "op", v: "==" },
                { t: "val", v: 1 },
            ],
        },
    ];

    resources.forEach((resource, index) => {
        conditions.push({
            id: `storage_empty_${resource}`,
            sortKey: `${index + 1}`,
            tokens: [
                { t: "ref", v: `self.state.${resource}.value` },
                { t: "op", v: "<=" },
                { t: "val", v: 0 },
            ],
        });
    });

    return {
        id: "sys_cycle_gc",
        sortKey: "sys_998",
        conditions,
        actions: [{ type: "KILL", entityId: "self" }],
    };
};
