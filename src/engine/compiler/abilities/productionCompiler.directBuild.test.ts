import { describe, expect, it, vi } from "vitest";
import { createBlueprint } from "../../test/factories";
import type { Blueprint } from "../../../data/schemas/blueprint";
import { Op } from "../../../data/schemas/primitives";
import { productionCompiler } from "./productionCompiler";

// Calls the pure productionCompiler directly and asserts the full emitted
// shape (state entries, passiveEffects, behavior rule) with deep equality, so
// every constructed id/key/op/target/default-literal and every branch flip is
// observable and killed.

const withCycle = (id = "prod_bp", extra: Record<string, unknown> = {}) =>
    createBlueprint(id, {
        components: {
            state: { cycle: { value: 0, max: 10, visible: false } },
        },
        ...extra,
    });

const findProdRule = (draft: Blueprint, id: string) =>
    draft.components.behavior?.rules?.find((entry) => entry.id === id);

describe("productionCompiler (direct build)", () => {
    it("emits the full state, passiveEffects, and rule for base-only external production", () => {
        const draft = withCycle();

        productionCompiler(
            draft,
            {
                resource: "wood",
                amount: { base: 2, perBody: 0, multPerBody: 0 },
                conditions: [],
            },
            0,
        );

        // Hidden base + final amount buffers, plus the external resource buffer
        // (target defaults to "tag:storage:wood", which is NOT "self").
        const state = draft.components.state as Record<string, unknown>;
        expect(state.vals_prod_base_wood_amt_0).toEqual({
            value: 2,
            visible: false,
        });
        expect(state.vals_prod_wood_amt_0).toEqual({ value: 2, visible: false });
        expect(state.vals_prod_wood_mult_0).toEqual({ value: 0, visible: false });
        expect(state.wood).toEqual({ value: 0, visible: false });

        // Exact passive-effect pipeline: base SET, then multiplier SET-from-global
        // / ADD 1, then final SET-from-base / MULT-by-multiplier.
        expect(draft.components.passiveEffects).toEqual([
            {
                op: Op.SET,
                target: "self.state.vals_prod_base_wood_amt_0.value",
                value: 2,
            },
            {
                op: Op.SET,
                target: "self.state.vals_prod_wood_mult_0.value",
                source: "global.habiti_resource_gain_bonus_wood",
            },
            {
                op: Op.ADD,
                target: "self.state.vals_prod_wood_mult_0.value",
                value: 1,
            },
            {
                op: Op.SET,
                target: "self.state.vals_prod_wood_amt_0.value",
                source: "self.state.vals_prod_base_wood_amt_0.value",
            },
            {
                op: Op.MULT,
                target: "self.state.vals_prod_wood_amt_0.value",
                source: "self.state.vals_prod_wood_mult_0.value",
            },
        ]);

        // Full production rule: MUTATE ADD into self buffer + TRANSFER to the
        // external storage tag, gated by the default cycle_complete conditions.
        expect(findProdRule(draft, "sys_produce_wood_0")).toEqual({
            id: "sys_produce_wood_0",
            sortKey: "sys_050",
            conditions: [
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
            ],
            actions: [
                {
                    type: "MUTATE",
                    target: "self.state.wood.value",
                    op: "ADD",
                    value: "self.state.vals_prod_wood_amt_0.value",
                },
                {
                    type: "TRANSFER",
                    source: "self",
                    target: "tag:storage:wood",
                    resource: "wood",
                    amount: "self.state.vals_prod_wood_amt_0.value",
                },
            ],
        });
    });

    it("uses the index in every emitted key and id", () => {
        const draft = withCycle();

        productionCompiler(
            draft,
            {
                resource: "wood",
                amount: { base: 1, perBody: 0, multPerBody: 0 },
                conditions: [],
            },
            3,
        );

        const state = draft.components.state as Record<string, unknown>;
        expect(state.vals_prod_base_wood_amt_3).toBeDefined();
        expect(state.vals_prod_wood_amt_3).toBeDefined();
        expect(state.vals_prod_base_wood_amt_0).toBeUndefined();
        expect(findProdRule(draft, "sys_produce_wood_3")).toBeDefined();
        expect(findProdRule(draft, "sys_produce_wood_0")).toBeUndefined();
    });

    it("targets self (MUTATE only, no TRANSFER, no external resource buffer) when target is 'self'", () => {
        const draft = withCycle();

        productionCompiler(
            draft,
            {
                resource: "wood",
                target: "self",
                amount: { base: 1, perBody: 0, multPerBody: 0 },
                conditions: [],
            },
            0,
        );

        // target === "self" -> the `state[resource] ??= ...` line is skipped.
        const state = draft.components.state as Record<string, unknown>;
        expect(state.wood).toBeUndefined();

        // Single ADD action; no TRANSFER.
        expect(findProdRule(draft, "sys_produce_wood_0")?.actions).toEqual([
            {
                type: "MUTATE",
                target: "self.state.wood.value",
                op: "ADD",
                value: "self.state.vals_prod_wood_amt_0.value",
            },
        ]);
    });

    it("defaults a blank target to the storage tag (truthy `||` fallback)", () => {
        const draft = withCycle();

        productionCompiler(
            draft,
            {
                resource: "stone",
                target: "",
                amount: { base: 1, perBody: 0, multPerBody: 0 },
                conditions: [],
            },
            0,
        );

        // empty-string target -> `config.target || "tag:storage:stone"`.
        const actions = findProdRule(draft, "sys_produce_stone_0")?.actions ?? [];
        expect(actions).toHaveLength(2);
        expect(actions[1]).toEqual({
            type: "TRANSFER",
            source: "self",
            target: "tag:storage:stone",
            resource: "stone",
            amount: "self.state.vals_prod_stone_amt_0.value",
        });
    });

    it("honours an explicit custom transfer target", () => {
        const draft = withCycle();

        productionCompiler(
            draft,
            {
                resource: "stone",
                target: "sys_world",
                amount: { base: 1, perBody: 0, multPerBody: 0 },
                conditions: [],
            },
            0,
        );

        const actions = findProdRule(draft, "sys_produce_stone_0")?.actions ?? [];
        expect(actions[1]).toEqual({
            type: "TRANSFER",
            source: "self",
            target: "sys_world",
            resource: "stone",
            amount: "self.state.vals_prod_stone_amt_0.value",
        });
        // A non-self, non-storage target still seeds the resource buffer.
        expect(
            (draft.components.state as Record<string, unknown>).stone,
        ).toEqual({ value: 0, visible: false });
    });

    it("trims the resource name before it flows into keys, target, and rule", () => {
        const draft = withCycle();

        productionCompiler(
            draft,
            {
                resource: "  wood  ",
                amount: { base: 1, perBody: 0, multPerBody: 0 },
                conditions: [],
            },
            0,
        );

        // resource is trimmed -> "wood" everywhere (no stray whitespace keys).
        const state = draft.components.state as Record<string, unknown>;
        expect(state.vals_prod_base_wood_amt_0).toBeDefined();
        expect(state.wood).toBeDefined();
        expect(findProdRule(draft, "sys_produce_wood_0")).toBeDefined();
    });

    it("defaults amount components to 0 when amount is omitted", () => {
        const draft = withCycle();

        productionCompiler(
            draft,
            { resource: "wood", conditions: [] } as never,
            0,
        );

        // amount?.base ?? 0 -> the base SET effect carries value 0.
        const state = draft.components.state as Record<string, unknown>;
        expect(state.vals_prod_base_wood_amt_0).toEqual({
            value: 0,
            visible: false,
        });
        expect(draft.components.passiveEffects).toEqual(
            expect.arrayContaining([
                {
                    op: Op.SET,
                    target: "self.state.vals_prod_base_wood_amt_0.value",
                    value: 0,
                },
            ]),
        );
    });

    it("warns and emits nothing when the resource is missing", () => {
        const draft = withCycle();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        productionCompiler(draft, { conditions: [] } as never, 0);

        expect(warn).toHaveBeenCalledWith(
            "Production ability missing resource on 'prod_bp'.",
        );
        // Early return before any state/effect/rule is added.
        expect(draft.components.behavior).toBeUndefined();
        expect(draft.components.passiveEffects).toBeUndefined();
        expect(draft.components.state).toEqual({
            cycle: { value: 0, max: 10, visible: false },
        });
        warn.mockRestore();
    });

    it("warns and emits nothing when the resource is only whitespace", () => {
        const draft = withCycle();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        productionCompiler(
            draft,
            { resource: "   ", conditions: [] } as never,
            0,
        );

        // trim() yields "" -> the !resource guard fires.
        expect(warn).toHaveBeenCalledWith(
            "Production ability missing resource on 'prod_bp'.",
        );
        expect(draft.components.behavior).toBeUndefined();
        warn.mockRestore();
    });

    it("warns about a missing cycle when a cycle trigger is required (default triggers)", () => {
        const draft = createBlueprint("nocycle", { components: { state: {} } });
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        productionCompiler(
            draft,
            {
                resource: "wood",
                amount: { base: 1, perBody: 0, multPerBody: 0 },
                conditions: [],
            },
            0,
        );

        expect(warn).toHaveBeenCalledWith(
            "Production ability requires cycle state on 'nocycle'.",
        );
        // The warning does NOT early-return: the rule is still produced.
        expect(findProdRule(draft, "sys_produce_wood_0")).toBeDefined();
        warn.mockRestore();
    });

    it("does NOT warn about a missing cycle when the trigger is assignment-only", () => {
        const draft = createBlueprint("nocycle", { components: { state: {} } });
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        productionCompiler(
            draft,
            {
                resource: "wood",
                amount: { base: 1, perBody: 0, multPerBody: 0 },
                triggers: ["assignment_complete"],
                conditions: [],
            },
            0,
        );

        expect(warn).not.toHaveBeenCalledWith(
            "Production ability requires cycle state on 'nocycle'.",
        );
        // assignment-only trigger condition replaces the cycle conditions.
        expect(findProdRule(draft, "sys_produce_wood_0")?.conditions).toEqual([
            {
                id: "assignment_complete",
                sortKey: "0",
                tokens: [],
                compiled: {
                    ">": [
                        { var: "self.state.assignment_complete_pulse.value" },
                        0,
                    ],
                },
            },
        ]);
        warn.mockRestore();
    });

    it("does NOT warn when a cycle trigger is required and the cycle is present", () => {
        const draft = withCycle();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        productionCompiler(
            draft,
            {
                resource: "wood",
                amount: { base: 1, perBody: 0, multPerBody: 0 },
                triggers: ["cycle_complete"],
                conditions: [],
            },
            0,
        );

        expect(warn).not.toHaveBeenCalledWith(
            "Production ability requires cycle state on 'prod_bp'.",
        );
        warn.mockRestore();
    });

    it("appends authored gate conditions from config.conditions to the production rule", () => {
        const draft = withCycle();

        productionCompiler(
            draft,
            {
                resource: "wood",
                amount: { base: 1, perBody: 0, multPerBody: 0 },
                conditions: ["self.state.active.value > 0"],
            },
            0,
        );

        const conditions = findProdRule(draft, "sys_produce_wood_0")?.conditions;
        // The 2 default cycle conditions plus 1 authored gate condition.
        expect(conditions).toHaveLength(3);
        expect(conditions?.[2]).toEqual({
            id: "gate_sys_produce_wood_0_0",
            sortKey: "z_gate_0",
            tokens: [
                { t: "ref", v: "self.state.active.value" },
                { t: "op", v: ">" },
                { t: "val", v: 0 },
            ],
        });
    });

    it("reuses an existing behavior.rules array and appends the production rule", () => {
        const draft = withCycle("prod_bp", {
            components: {
                state: { cycle: { value: 0, max: 10, visible: false } },
                behavior: {
                    rules: [
                        {
                            id: "pre_existing",
                            sortKey: "sys_001",
                            conditions: [],
                            actions: [],
                        },
                    ],
                },
            },
        });

        productionCompiler(
            draft,
            {
                resource: "wood",
                target: "self",
                amount: { base: 1, perBody: 0, multPerBody: 0 },
                conditions: [],
            },
            0,
        );

        expect(draft.components.behavior?.rules?.map((r) => r.id)).toEqual([
            "pre_existing",
            "sys_produce_wood_0",
        ]);
    });

    it("does not duplicate base/final state entries that already exist (??= no-op)", () => {
        const draft = withCycle();
        // Pre-seed the base buffer with a sentinel value.
        (draft.components.state as Record<string, unknown>).vals_prod_base_wood_amt_0 =
            { value: 99, visible: true };

        productionCompiler(
            draft,
            {
                resource: "wood",
                target: "self",
                amount: { base: 5, perBody: 0, multPerBody: 0 },
                conditions: [],
            },
            0,
        );

        // The ??= leaves the existing base entry untouched; compileScalableValue
        // then overwrites its `.value` to the new base via setInitialValue, but
        // keeps the pre-existing visible:true (it only sets the matched field).
        expect(
            (draft.components.state as Record<string, unknown>)
                .vals_prod_base_wood_amt_0,
        ).toEqual({ value: 5, visible: true });
    });

    // --- residual mutation survivors -------------------------------------

    it("warns about a missing cycle when components has no state object (inner optional-chain)", () => {
        // L28 `draft.components?.state?.cycle` — components present, state
        // absent. The inner `?.state` must short-circuit (no throw) and the
        // cycle is treated as missing, so the warning fires.
        const draft = createBlueprint("nostate", {});
        delete (draft.components as { state?: unknown }).state;
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        productionCompiler(
            draft,
            {
                resource: "wood",
                amount: { base: 1, perBody: 0, multPerBody: 0 },
                triggers: ["cycle_complete"],
                conditions: [],
            },
            0,
        );

        expect(warn).toHaveBeenCalledWith(
            "Production ability requires cycle state on 'nostate'.",
        );
        warn.mockRestore();
    });

    it("warns about a missing cycle when the whole components object is absent (outer optional-chain)", () => {
        // L28 outer `draft.components?.` — components is undefined; the chain
        // short-circuits and the cycle is treated as missing.
        const draft = createBlueprint("nocomps", {});
        delete (draft as { components?: unknown }).components;
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        productionCompiler(
            draft,
            {
                resource: "wood",
                amount: { base: 1, perBody: 0, multPerBody: 0 },
                triggers: ["cycle_complete"],
                conditions: [],
            },
            0,
        );

        expect(warn).toHaveBeenCalledWith(
            "Production ability requires cycle state on 'nocomps'.",
        );
        warn.mockRestore();
    });

    it("flows perBody and multPerBody through the scalable pipeline under the temp-var name", () => {
        // L37 `?? 0` (perBody) and L38 `?? 0` (multPerBody): a `&&` mutant would
        // zero out non-zero inputs, dropping the per-body / mult-per-body effect
        // chains. L56 fixes the temp-var name `prod_${resource}_base_${index}`,
        // observed as the `vals_prod_wood_base_0[/_m]` temp state keys.
        const draft = withCycle();

        productionCompiler(
            draft,
            {
                resource: "wood",
                amount: { base: 2, perBody: 3, multPerBody: 4 },
                conditions: [],
            },
            0,
        );

        const state = draft.components.state as Record<string, unknown>;
        // Per-body temp key and mult-per-body temp key, both keyed off the
        // exact temp-var name "prod_wood_base_0".
        expect(state.vals_prod_wood_base_0).toEqual({ value: 0, visible: false });
        expect(state.vals_prod_wood_base_0_m).toEqual({
            value: 0,
            visible: false,
        });

        // The per-body (MULT by 3) and mult-per-body (MULT by 4) effects must
        // both be present and reference the temp-var-named keys.
        expect(draft.components.passiveEffects).toEqual(
            expect.arrayContaining([
                {
                    op: Op.SET,
                    target: "self.state.vals_prod_base_wood_amt_0.value",
                    value: 2,
                },
                {
                    op: Op.SET,
                    target: "self.state.vals_prod_wood_base_0",
                    source: "global.population",
                },
                {
                    op: Op.MULT,
                    target: "self.state.vals_prod_wood_base_0",
                    value: 3,
                },
                {
                    op: Op.ADD,
                    target: "self.state.vals_prod_base_wood_amt_0.value",
                    source: "self.state.vals_prod_wood_base_0",
                },
                {
                    op: Op.SET,
                    target: "self.state.vals_prod_wood_base_0_m",
                    source: "global.population",
                },
                {
                    op: Op.MULT,
                    target: "self.state.vals_prod_wood_base_0_m",
                    value: 4,
                },
                {
                    op: Op.MULT,
                    target: "self.state.vals_prod_base_wood_amt_0.value",
                    source: "self.state.vals_prod_wood_base_0_m",
                },
            ]),
        );
    });

    it("creates behavior as { rules: [...] } when components has no behavior yet", () => {
        // L66 `draft.components.behavior ??= { rules: [] }`: with no prior
        // behavior, the object literal AND its rules array must be created so
        // the production rule has somewhere to live.
        const draft = withCycle();
        expect(draft.components.behavior).toBeUndefined();

        productionCompiler(
            draft,
            {
                resource: "wood",
                target: "self",
                amount: { base: 1, perBody: 0, multPerBody: 0 },
                conditions: [],
            },
            0,
        );

        expect(Array.isArray(draft.components.behavior?.rules)).toBe(true);
        expect(draft.components.behavior?.rules?.map((r) => r.id)).toEqual([
            "sys_produce_wood_0",
        ]);
    });

    it("reuses an existing behavior object missing its rules array (L67 ??= [])", () => {
        // L67 `draft.components.behavior.rules ??= []` is only reached when a
        // behavior object exists WITHOUT a rules array. The production rule must
        // seed that array.
        const draft = withCycle();
        draft.components.behavior = {} as Blueprint["components"]["behavior"];

        productionCompiler(
            draft,
            {
                resource: "wood",
                target: "self",
                amount: { base: 1, perBody: 0, multPerBody: 0 },
                conditions: [],
            },
            0,
        );

        expect(draft.components.behavior?.rules?.map((r) => r.id)).toEqual([
            "sys_produce_wood_0",
        ]);
    });

    it("uses the '<id>:production' context label when an authored condition fails to compile", () => {
        // L75: appendRuleConditions receives `${draft.id}:production` as the
        // context label, surfaced verbatim in the warning for a malformed
        // condition. An empty-string label mutant would drop the prefix.
        const draft = withCycle();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        productionCompiler(
            draft,
            {
                resource: "wood",
                amount: { base: 1, perBody: 0, multPerBody: 0 },
                // 5 parts -> compileConditionText fails -> warn with context.
                conditions: ["self.state.active.value too many parts"],
            },
            0,
        );

        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("Condition error in prod_bp:production:"),
        );
        warn.mockRestore();
    });
});
