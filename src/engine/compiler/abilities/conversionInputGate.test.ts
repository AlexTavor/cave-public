import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import { buildInputGateDemandRules } from "./conversionInputGate";

const makeDraft = (passiveEffects?: unknown[]) =>
    createBlueprint("smelter", {
        components: {
            ...(passiveEffects === undefined
                ? {}
                : { passiveEffects: passiveEffects as never }),
        },
    });

const INPUT_REFS = [
    { resource: "iron", amountRef: "self.state.vals_conv_in_iron_0_0.value" },
    { resource: "coal", amountRef: "self.state.vals_conv_in_coal_0_1.value" },
];

describe("buildInputGateDemandRules", () => {
    it("returns one gate rule per input, fully shaped, mutating every baseDemand attr", () => {
        const draft = makeDraft([
            {
                op: "SET",
                target: "self.powerSink.baseDemand.heat",
                value: 5,
            },
            {
                op: "SET",
                target: "self.powerSink.baseDemand.light",
                value: 3,
            },
        ]);

        const rules = buildInputGateDemandRules(draft, INPUT_REFS, 2);

        expect(rules).toEqual([
            {
                id: "sys_conv_power_gate_2_0",
                sortKey: "sys_000",
                conditions: [
                    {
                        id: "no_input",
                        sortKey: "0",
                        tokens: [
                            {
                                t: "ref",
                                v: "self.state.iron.value",
                            },
                            { t: "op", v: "<" },
                            {
                                t: "ref",
                                v: "self.state.vals_conv_in_iron_0_0.value",
                            },
                        ],
                    },
                ],
                actions: [
                    {
                        type: "MUTATE",
                        target: "self.powerSink.baseDemand.heat",
                        op: "SET",
                        value: 0,
                    },
                    {
                        type: "MUTATE",
                        target: "self.powerSink.baseDemand.light",
                        op: "SET",
                        value: 0,
                    },
                ],
            },
            {
                id: "sys_conv_power_gate_2_1",
                sortKey: "sys_000",
                conditions: [
                    {
                        id: "no_input",
                        sortKey: "0",
                        tokens: [
                            {
                                t: "ref",
                                v: "self.state.coal.value",
                            },
                            { t: "op", v: "<" },
                            {
                                t: "ref",
                                v: "self.state.vals_conv_in_coal_0_1.value",
                            },
                        ],
                    },
                ],
                actions: [
                    {
                        type: "MUTATE",
                        target: "self.powerSink.baseDemand.heat",
                        op: "SET",
                        value: 0,
                    },
                    {
                        type: "MUTATE",
                        target: "self.powerSink.baseDemand.light",
                        op: "SET",
                        value: 0,
                    },
                ],
            },
        ]);
    });

    it("dedupes repeated baseDemand attrs into a single action", () => {
        const draft = makeDraft([
            { op: "SET", target: "self.powerSink.baseDemand.heat", value: 5 },
            { op: "ADD", target: "self.powerSink.baseDemand.heat", value: 2 },
        ]);

        const rules = buildInputGateDemandRules(
            draft,
            [INPUT_REFS[0]!],
            0,
        );

        expect(rules).toEqual([
            {
                id: "sys_conv_power_gate_0_0",
                sortKey: "sys_000",
                conditions: [
                    {
                        id: "no_input",
                        sortKey: "0",
                        tokens: [
                            { t: "ref", v: "self.state.iron.value" },
                            { t: "op", v: "<" },
                            {
                                t: "ref",
                                v: "self.state.vals_conv_in_iron_0_0.value",
                            },
                        ],
                    },
                ],
                actions: [
                    {
                        type: "MUTATE",
                        target: "self.powerSink.baseDemand.heat",
                        op: "SET",
                        value: 0,
                    },
                ],
            },
        ]);
    });

    it("returns [] when no passiveEffects component exists (optional chaining + ?? [] guard)", () => {
        const draft = makeDraft(undefined);
        expect(buildInputGateDemandRules(draft, INPUT_REFS, 0)).toEqual([]);
    });

    it("returns [] when no effect targets a baseDemand attr (prefix filter)", () => {
        const draft = makeDraft([
            { op: "SET", target: "self.state.iron.value", value: 5 },
            { op: "SET", target: "self.powerSink.other.heat", value: 5 },
        ]);
        expect(buildInputGateDemandRules(draft, INPUT_REFS, 0)).toEqual([]);
    });

    it("excludes baseDemand attrs whose value is not strictly > 0 (Number(value) > 0 guard)", () => {
        const draft = makeDraft([
            { op: "SET", target: "self.powerSink.baseDemand.zero", value: 0 },
            { op: "SET", target: "self.powerSink.baseDemand.neg", value: -1 },
            { op: "SET", target: "self.powerSink.baseDemand.pos", value: 1 },
        ]);

        const rules = buildInputGateDemandRules(draft, [INPUT_REFS[0]!], 0);

        // Only the positive attr survives -> exactly one action.
        expect(rules).toEqual([
            {
                id: "sys_conv_power_gate_0_0",
                sortKey: "sys_000",
                conditions: [
                    {
                        id: "no_input",
                        sortKey: "0",
                        tokens: [
                            { t: "ref", v: "self.state.iron.value" },
                            { t: "op", v: "<" },
                            {
                                t: "ref",
                                v: "self.state.vals_conv_in_iron_0_0.value",
                            },
                        ],
                    },
                ],
                actions: [
                    {
                        type: "MUTATE",
                        target: "self.powerSink.baseDemand.pos",
                        op: "SET",
                        value: 0,
                    },
                ],
            },
        ]);
    });

    it("treats a missing effect target as empty string (e.target ?? '') and skips it", () => {
        const draft = makeDraft([
            { op: "SET", value: 5 },
            { op: "SET", target: "self.powerSink.baseDemand.heat", value: 5 },
        ]);

        const rules = buildInputGateDemandRules(draft, [INPUT_REFS[0]!], 0);

        expect(rules[0]!.actions).toEqual([
            {
                type: "MUTATE",
                target: "self.powerSink.baseDemand.heat",
                op: "SET",
                value: 0,
            },
        ]);
    });

    it("returns [] when there are attrs but inputRefs is empty (right side of guard)", () => {
        const draft = makeDraft([
            { op: "SET", target: "self.powerSink.baseDemand.heat", value: 5 },
        ]);
        expect(buildInputGateDemandRules(draft, [], 0)).toEqual([]);
    });
});
