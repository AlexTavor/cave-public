import { describe, it, expect } from "vitest";
import { createBlueprint } from "../../test/factories";
import { compileStorageAutoRequest } from "./storageAutoRequestCompiler";
import type { StorageAutoRequestConfig } from "../../../data/schemas/abilities/storageAutoRequest";
import type { Blueprint } from "../../../data/schemas/blueprint";

const makeDraft = (extra: Record<string, unknown> = {}): Blueprint =>
    createBlueprint("store", {
        components: {
            state: { food: { value: 0, max: 100, visible: true } },
            ...extra,
        },
    });

const makeConfig = (
    overrides: Partial<StorageAutoRequestConfig> = {},
): StorageAutoRequestConfig => ({
    enabled: true,
    cadence_s: 1,
    source: "tag:storage:food",
    minRequest: 1,
    maxRequest: 50,
    ...overrides,
});

// The timer-ready gate condition shared by all three emitted rules.
const timerCond = (resource: string, index: number, cadence: number) => ({
    id: "timer_ready",
    sortKey: "0",
    tokens: [
        { t: "ref", v: `self.state.auto_req_${resource}_timer_${index}.value` },
        { t: "op", v: ">=" },
        { t: "val", v: cadence },
    ],
});

// A throttle gate appended by withThrottleCondition when powerSink is an object.
const throttleCond = {
    id: "throttle_active",
    sortKey: "3",
    tokens: [
        { t: "ref", v: "self.powerSink.throttle" },
        { t: "op", v: ">" },
        { t: "val", v: 0 },
    ],
};

describe("compileStorageAutoRequest", () => {
    it("does nothing when disabled", () => {
        const draft = makeDraft();
        const before = structuredClone(draft);

        compileStorageAutoRequest(
            draft,
            makeConfig({ enabled: false }),
            "food",
            0,
        );

        expect(draft).toEqual(before);
    });

    it("emits the full passiveEffects + behavior rule set (un-throttled)", () => {
        const draft = makeDraft();

        compileStorageAutoRequest(draft, makeConfig(), "food", 0);

        // Timer state + need state created by ensureStateEntry.
        expect(draft.components.state).toEqual({
            food: { value: 0, max: 100, visible: true },
            auto_req_food_timer_0: { value: 0, visible: false },
            auto_req_food_need_0: { value: 0, visible: false },
        });

        expect(draft.components.passiveEffects).toEqual([
            {
                op: "ADD",
                target: "self.state.auto_req_food_timer_0.value",
                source: "global.dt_s",
            },
        ]);

        expect(draft.components.behavior).toEqual({
            rules: [
                {
                    id: "sys_auto_req_food_need_0",
                    sortKey: "sys_050",
                    conditions: [timerCond("food", 0, 1)],
                    actions: [
                        {
                            type: "MUTATE",
                            target: "self.state.auto_req_food_need_0.value",
                            op: "SET",
                            value: "self.state.food.max - self.state.food.value",
                        },
                    ],
                },
                {
                    id: "sys_auto_req_food_xfer_0",
                    sortKey: "sys_051",
                    conditions: [
                        timerCond("food", 0, 1),
                        {
                            id: "need_above_min",
                            sortKey: "1",
                            tokens: [
                                {
                                    t: "ref",
                                    v: "self.state.auto_req_food_need_0.value",
                                },
                                { t: "op", v: ">=" },
                                { t: "val", v: 1 },
                            ],
                        },
                        {
                            id: "need_check",
                            sortKey: "2",
                            tokens: [
                                {
                                    t: "ref",
                                    v: "self.state.auto_req_food_need_0.value",
                                },
                                { t: "op", v: "<=" },
                                { t: "val", v: 50 },
                            ],
                        },
                    ],
                    actions: [
                        {
                            type: "TRANSFER",
                            source: "tag:storage:food",
                            target: "self",
                            resource: "food",
                            amount: "self.state.auto_req_food_need_0.value",
                        },
                        {
                            type: "MUTATE",
                            target: "self.state.auto_req_food_timer_0.value",
                            op: "SET",
                            value: 0,
                        },
                    ],
                },
                {
                    id: "sys_auto_req_food_xfer_cap_0",
                    sortKey: "sys_052",
                    conditions: [
                        timerCond("food", 0, 1),
                        {
                            id: "need_above_min",
                            sortKey: "1",
                            tokens: [
                                {
                                    t: "ref",
                                    v: "self.state.auto_req_food_need_0.value",
                                },
                                { t: "op", v: ">=" },
                                { t: "val", v: 1 },
                            ],
                        },
                        {
                            id: "need_check",
                            sortKey: "2",
                            tokens: [
                                {
                                    t: "ref",
                                    v: "self.state.auto_req_food_need_0.value",
                                },
                                { t: "op", v: ">" },
                                { t: "val", v: 50 },
                            ],
                        },
                    ],
                    actions: [
                        {
                            type: "TRANSFER",
                            source: "tag:storage:food",
                            target: "self",
                            resource: "food",
                            amount: 50,
                        },
                        {
                            type: "MUTATE",
                            target: "self.state.auto_req_food_timer_0.value",
                            op: "SET",
                            value: 0,
                        },
                    ],
                },
            ],
        });
    });

    it("threads resource, index, cadence, min and max through every token", () => {
        const draft = makeDraft({
            state: { coin: { value: 0, max: 100, visible: true } },
        });

        compileStorageAutoRequest(
            draft,
            makeConfig({
                source: "tag:storage:coin",
                cadence_s: 4,
                minRequest: 10,
                maxRequest: 25,
            }),
            "coin",
            3,
        );

        const rules = draft.components.behavior?.rules ?? [];
        expect(rules.map((r) => r.id)).toEqual([
            "sys_auto_req_coin_need_3",
            "sys_auto_req_coin_xfer_3",
            "sys_auto_req_coin_xfer_cap_3",
        ]);

        // Timer gate carries the configured cadence (4) and indexed timer key.
        expect(rules[1].conditions[0]).toEqual(timerCond("coin", 3, 4));
        // need_above_min carries minRequest (10); need_check carries maxRequest (25).
        expect(rules[1].conditions[1].tokens).toContainEqual({ t: "val", v: 10 });
        expect(rules[1].conditions[2].tokens).toContainEqual({ t: "val", v: 25 });
        // Capped rule's transfer amount is exactly maxRequest (25).
        expect(rules[2].actions[0]).toMatchObject({ amount: 25 });
        // Timer-reset target is indexed.
        expect(rules[1].actions[1]).toMatchObject({
            target: "self.state.auto_req_coin_timer_3.value",
        });
    });

    it("defaults the transfer source to tag:storage:<resource> when source is omitted", () => {
        const draft = makeDraft();

        compileStorageAutoRequest(
            draft,
            makeConfig({ source: undefined }),
            "food",
            0,
        );

        const rules = draft.components.behavior?.rules ?? [];
        for (const id of [
            "sys_auto_req_food_xfer_0",
            "sys_auto_req_food_xfer_cap_0",
        ]) {
            const rule = rules.find((r) => r.id === id);
            expect(rule?.actions[0]).toMatchObject({
                source: "tag:storage:food",
            });
        }
    });

    it("uses the explicit source verbatim when provided", () => {
        const draft = makeDraft();

        compileStorageAutoRequest(
            draft,
            makeConfig({ source: "node:silo_42" }),
            "food",
            0,
        );

        const rules = draft.components.behavior?.rules ?? [];
        const xfer = rules.find((r) => r.id === "sys_auto_req_food_xfer_0");
        expect(xfer?.actions[0]).toMatchObject({ source: "node:silo_42" });
    });

    it("appends a throttle condition to transfer rules when powerSink is an object", () => {
        const draft = makeDraft({ powerSink: { throttle: 1 } });

        compileStorageAutoRequest(draft, makeConfig(), "food", 0);

        const rules = draft.components.behavior?.rules ?? [];
        const need = rules.find((r) => r.id === "sys_auto_req_food_need_0");
        const xfer = rules.find((r) => r.id === "sys_auto_req_food_xfer_0");
        const cap = rules.find((r) => r.id === "sys_auto_req_food_xfer_cap_0");

        // The need rule is NOT wrapped by withThrottleCondition: 1 condition.
        expect(need?.conditions).toHaveLength(1);
        // Transfer rules gain a 4th (throttle) condition with exact tokens.
        expect(xfer?.conditions).toHaveLength(4);
        expect(xfer?.conditions[3]).toEqual(throttleCond);
        expect(cap?.conditions).toHaveLength(4);
        expect(cap?.conditions[3]).toEqual(throttleCond);
    });

    it("does NOT append a throttle condition when powerSink is absent", () => {
        const draft = makeDraft();

        compileStorageAutoRequest(draft, makeConfig(), "food", 0);

        const rules = draft.components.behavior?.rules ?? [];
        const xfer = rules.find((r) => r.id === "sys_auto_req_food_xfer_0");
        const cap = rules.find((r) => r.id === "sys_auto_req_food_xfer_cap_0");
        expect(xfer?.conditions).toHaveLength(3);
        expect(cap?.conditions).toHaveLength(3);
        expect(
            xfer?.conditions.some((c) => c.id === "throttle_active"),
        ).toBe(false);
    });

    it("appends rules to a pre-existing behavior.rules array (does not clobber)", () => {
        const draft = makeDraft({
            behavior: {
                rules: [
                    {
                        id: "user_rule",
                        sortKey: "z",
                        conditions: [],
                        actions: [],
                    },
                ],
            },
        });

        compileStorageAutoRequest(draft, makeConfig(), "food", 0);

        const rules = draft.components.behavior?.rules ?? [];
        expect(rules[0]?.id).toBe("user_rule");
        expect(rules.map((r) => r.id)).toEqual([
            "user_rule",
            "sys_auto_req_food_need_0",
            "sys_auto_req_food_xfer_0",
            "sys_auto_req_food_xfer_cap_0",
        ]);
    });

    it("appends the timer ADD effect to pre-existing passiveEffects", () => {
        const existing = {
            op: "SET" as const,
            target: "self.state.other.value",
            value: 1,
        };
        const draft = makeDraft({ passiveEffects: [existing] });

        compileStorageAutoRequest(draft, makeConfig(), "food", 0);

        expect(draft.components.passiveEffects).toEqual([
            existing,
            {
                op: "ADD",
                target: "self.state.auto_req_food_timer_0.value",
                source: "global.dt_s",
            },
        ]);
    });

    it("treats a non-object powerSink (e.g. number) as un-throttled", () => {
        // typeof components.powerSink === "object" must be false for a number,
        // so no throttle condition is added.
        const draft = makeDraft({ powerSink: 5 });

        compileStorageAutoRequest(draft, makeConfig(), "food", 0);

        const rules = draft.components.behavior?.rules ?? [];
        const xfer = rules.find((r) => r.id === "sys_auto_req_food_xfer_0");
        expect(xfer?.conditions).toHaveLength(3);
    });
});
