import type { Blueprint } from "../../../data/schemas/blueprint";
import type { BehaviorRule } from "../../../data/schemas/behavior";

export const buildInputGateDemandRules = (
    draft: Blueprint,
    inputRefs: Array<{ resource: string; amountRef: string }>,
    index: number,
): BehaviorRule[] => {
    const attrs = [
        ...new Set(
            (draft.components?.passiveEffects ?? [])
                .filter(
                    (e) =>
                        (e.target ?? "").startsWith(
                            "self.powerSink.baseDemand.",
                        ) && Number(e.value) > 0,
                )
                .map((e) => e.target.split(".").pop()!),
        ),
    ];
    if (!attrs.length || !inputRefs.length) return [];
    const actions: BehaviorRule["actions"] = attrs.map((a) => ({
        type: "MUTATE" as const,
        target: `self.powerSink.baseDemand.${a}`,
        op: "SET" as const,
        value: 0,
    }));
    return inputRefs.map((inp, idx) => ({
        id: `sys_conv_power_gate_${index}_${idx}`,
        sortKey: "sys_000",
        conditions: [
            {
                id: "no_input",
                sortKey: "0",
                tokens: [
                    {
                        t: "ref" as const,
                        v: `self.state.${inp.resource}.value`,
                    },
                    { t: "op" as const, v: "<" },
                    { t: "ref" as const, v: inp.amountRef },
                ],
            },
        ],
        actions,
    }));
};
