import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import type { Blueprint } from "../../../data/schemas/blueprint";
import type { CycleAbilityConfig } from "../../../data/schemas/abilities/cycle";
import { cycleCompiler } from "./cycleCompiler";

const baseConfig = (
    overrides: Partial<CycleAbilityConfig> = {},
): CycleAbilityConfig =>
    ({
        maxProgress: { base: 10, perBody: 0, multPerBody: 0 },
        costMultPerCycle: 0,
        inputs: {},
        oneOff: false,
        conditions: [],
        ...overrides,
    }) as CycleAbilityConfig;

const findRule = (draft: Blueprint, id: string) =>
    draft.components.behavior?.rules?.find((r) => r.id === id);

const POWER_SINK = {
    baseDemand: { body: 0, mind: 0, social: 0 },
    maxDemand: { body: 0, mind: 0, social: 0 },
    throttle: 0,
    efficiency: 1,
    drawFraction: {},
    allocatedDraw: { body: 0, mind: 0, social: 0 },
    showThrottleSlider: true,
    status: "nominal",
};

describe("cycleCompiler (deep structural)", () => {
    it("seeds state.cycle with value 0, max = maxProgress.base, visible, scaleOnMaxChange", () => {
        const draft = createBlueprint("reactor", { components: {} });

        cycleCompiler(draft, baseConfig({ maxProgress: { base: 42, perBody: 0, multPerBody: 0 } }));

        // max is taken from maxProgress.base (42, not the 100 default) -> pins
        // the base read and every boolean/number literal on state.cycle.
        expect(draft.components.state?.cycle).toEqual({
            value: 0,
            max: 42,
            visible: true,
            scaleOnMaxChange: true,
        });
    });

    it("defaults maxProgress.base to 100 when maxProgress is undefined (normalizeScale ?? path)", () => {
        const draft = createBlueprint("reactor", { components: {} });

        cycleCompiler(draft, baseConfig({ maxProgress: undefined }));

        // normalizeScale(undefined) -> base 100. Drives the `value?.base ?? 100`
        // optional-chain + logical-or to the fallback side.
        expect(draft.components.state?.cycle?.max).toBe(100);
    });

    it("seeds state.cycle_active to { value: 1, visible: false } and omits is_depleted for non-oneOff", () => {
        const draft = createBlueprint("reactor", { components: {} });

        cycleCompiler(draft, baseConfig({ oneOff: false }));

        expect(draft.components.state?.cycle_active).toEqual({
            value: 1,
            visible: false,
        });
        // oneOff false -> the is_depleted branch is skipped entirely.
        expect(draft.components.state).not.toHaveProperty("is_depleted");
    });

    it("adds is_depleted state for a one-off cycle", () => {
        const draft = createBlueprint("loot", { components: {} });

        cycleCompiler(draft, baseConfig({ oneOff: true }));

        // oneOff true -> is_depleted seeded with the exact resting values.
        expect(draft.components.state?.is_depleted).toEqual({
            value: 0,
            visible: false,
        });
    });

    it("builds the default powerSink verbatim (throttle 0 when not startActive)", () => {
        const draft = createBlueprint("reactor", { components: {} });

        cycleCompiler(draft, baseConfig({ startActive: false }));

        // Deep-equal pins baseDemand/maxDemand/allocatedDraw shapes, efficiency,
        // drawFraction, showThrottleSlider true, status "nominal", throttle 0.
        expect(draft.components.powerSink).toEqual(POWER_SINK);
    });

    it("sets powerSink.throttle to 1 when startActive is true", () => {
        const draft = createBlueprint("reactor", { components: {} });

        cycleCompiler(draft, baseConfig({ startActive: true }));

        // startActive ? 1 : 0 -> 1 (drives the conditional's true branch).
        expect(draft.components.powerSink).toEqual({
            ...POWER_SINK,
            throttle: 1,
        });
    });

    it("hides the throttle slider only when showThrottleSlider is explicitly false", () => {
        const hidden = createBlueprint("a", { components: {} });
        const shownDefault = createBlueprint("b", { components: {} });
        const shownTrue = createBlueprint("c", { components: {} });

        cycleCompiler(hidden, baseConfig({ showThrottleSlider: false }));
        cycleCompiler(shownDefault, baseConfig({ showThrottleSlider: undefined }));
        cycleCompiler(shownTrue, baseConfig({ showThrottleSlider: true }));

        // `config.showThrottleSlider !== false`: only the literal false hides it.
        expect(hidden.components.powerSink?.showThrottleSlider).toBe(false);
        expect(shownDefault.components.powerSink?.showThrottleSlider).toBe(true);
        expect(shownTrue.components.powerSink?.showThrottleSlider).toBe(true);
    });

    it("reuses an existing powerSink and fills missing baseDemand/maxDemand (??= RHS)", () => {
        // powerSink present WITHOUT baseDemand / maxDemand forces the `??=`
        // right-hand object literals at L66/L67 to actually evaluate.
        const draft = createBlueprint("reactor", {
            components: {
                powerSink: {
                    throttle: 0,
                    efficiency: 1,
                    drawFraction: {},
                    allocatedDraw: { body: 0, mind: 0, social: 0 },
                    showThrottleSlider: true,
                    status: "nominal",
                } as Blueprint["components"]["powerSink"],
            },
        });

        cycleCompiler(draft, baseConfig());

        expect(draft.components.powerSink?.baseDemand).toEqual({
            body: 0,
            mind: 0,
            social: 0,
        });
        expect(draft.components.powerSink?.maxDemand).toEqual({
            body: 0,
            mind: 0,
            social: 0,
        });
    });

    it("initialises behavior.rules when behavior exists but rules is undefined (??= RHS)", () => {
        // behavior present, rules missing -> drives `behavior.rules ??= []`.
        const draft = createBlueprint("reactor", {
            components: {
                behavior: {} as Blueprint["components"]["behavior"],
            },
        });

        cycleCompiler(draft, baseConfig());

        // The reset rule must still be pushed onto the freshly-defaulted array.
        const rules = draft.components.behavior?.rules ?? [];
        expect(Array.isArray(rules)).toBe(true);
        // A plain (non-oneOff, no-costMult, no-transform, no-inputs) cycle yields
        // exactly the reset rule. Asserting the full id list + that every entry
        // is a real rule object kills an `??= []` array-seed mutation (e.g. one
        // that pre-fills the array with a sentinel before the push).
        expect(rules.map((r) => r.id)).toEqual(["sys_cycle_reset"]);
        expect(rules.every((r) => typeof r === "object" && r !== null)).toBe(
            true,
        );
    });

    it("pushes a transition rule only when transformTo is set", () => {
        const withTransform = createBlueprint("a", { components: {} });
        const without = createBlueprint("b", { components: {} });

        cycleCompiler(withTransform, baseConfig({ transformTo: "bp_house" }));
        cycleCompiler(without, baseConfig({ transformTo: undefined }));

        // Drives the `if (config.transformTo)` both ways.
        expect(findRule(withTransform, "sys_cycle_transition")).toEqual({
            id: "sys_cycle_transition",
            sortKey: "sys_995",
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
                    type: "PATCH_BLUEPRINT",
                    blueprintId: "bp_house",
                    components: {},
                },
            ],
        });
        expect(findRule(without, "sys_cycle_transition")).toBeUndefined();
    });

    it("builds a plain reset rule (no depletion / no cycle_count) for a non-oneOff, no-costMult cycle", () => {
        const draft = createBlueprint("reactor", { components: {} });

        cycleCompiler(draft, baseConfig({ oneOff: false, costMultPerCycle: 0 }));

        // Both reset-rule conditionals false -> only the SET cycle.value action.
        expect(findRule(draft, "sys_cycle_reset")).toEqual({
            id: "sys_cycle_reset",
            sortKey: "sys_999",
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
                    target: "self.state.cycle.value",
                    op: "SET",
                    value: 0,
                },
            ],
        });
    });

    it("adds the is_depleted + sink-reset actions to the reset rule for a one-off cycle", () => {
        const draft = createBlueprint("loot", { components: {} });

        cycleCompiler(draft, baseConfig({ oneOff: true }));

        // oneOff:true makes createCycleResetRule append the is_depleted SET and
        // the full throttle/baseDemand/maxDemand sink-reset block.
        const reset = findRule(draft, "sys_cycle_reset");
        expect(reset?.actions).toEqual([
            {
                type: "MUTATE",
                target: "self.state.cycle.value",
                op: "SET",
                value: 0,
            },
            {
                type: "MUTATE",
                target: "self.state.is_depleted.value",
                op: "SET",
                value: 1,
            },
            {
                type: "MUTATE",
                target: "self.powerSink.throttle",
                op: "SET",
                value: 0,
            },
            {
                type: "MUTATE",
                target: "self.powerSink.baseDemand.body",
                op: "SET",
                value: 0,
            },
            {
                type: "MUTATE",
                target: "self.powerSink.maxDemand.body",
                op: "SET",
                value: 0,
            },
            {
                type: "MUTATE",
                target: "self.powerSink.baseDemand.mind",
                op: "SET",
                value: 0,
            },
            {
                type: "MUTATE",
                target: "self.powerSink.maxDemand.mind",
                op: "SET",
                value: 0,
            },
            {
                type: "MUTATE",
                target: "self.powerSink.baseDemand.social",
                op: "SET",
                value: 0,
            },
            {
                type: "MUTATE",
                target: "self.powerSink.maxDemand.social",
                op: "SET",
                value: 0,
            },
        ]);
    });

    it("adds a cycle_count increment to the reset rule when costMultPerCycle > 0", () => {
        const draft = createBlueprint("reactor", { components: {} });

        cycleCompiler(draft, baseConfig({ costMultPerCycle: 2 }));

        // hasCostMult true -> reset rule gains the cycle_count ADD action.
        const reset = findRule(draft, "sys_cycle_reset");
        expect(reset?.actions).toContainEqual({
            type: "MUTATE",
            target: "self.state.cycle_count.value",
            op: "ADD",
            value: 1,
        });
        // And the cost scaler seeds cycle_count state.
        expect(draft.components.state?.cycle_count).toEqual({
            value: 1,
            visible: false,
        });
    });

    it("does NOT add a cycle_count increment when costMultPerCycle is 0", () => {
        const draft = createBlueprint("reactor", { components: {} });

        cycleCompiler(draft, baseConfig({ costMultPerCycle: 0 }));

        // hasCostMult false (0 is not > 0) -> no cycle_count action / state.
        const reset = findRule(draft, "sys_cycle_reset");
        expect(
            reset?.actions.some(
                (a) =>
                    a.type === "MUTATE" &&
                    a.target === "self.state.cycle_count.value",
            ),
        ).toBe(false);
        expect(draft.components.state).not.toHaveProperty("cycle_count");
    });

    it("appends a GC rule only for one-off cycles", () => {
        const oneOff = createBlueprint("loot", { components: {} });
        const repeat = createBlueprint("mine", { components: {} });

        cycleCompiler(oneOff, baseConfig({ oneOff: true }));
        cycleCompiler(repeat, baseConfig({ oneOff: false }));

        // Drives the second `if (config.oneOff)` (GC) both ways.
        expect(findRule(oneOff, "sys_cycle_gc")).toBeDefined();
        expect(findRule(repeat, "sys_cycle_gc")).toBeUndefined();
    });

    it("does not append a progress bar when showProgressBar is falsy", () => {
        // Display is present, so only the `if (config.showProgressBar)` guard
        // (not appendCycleBar's own display guard) decides the outcome here.
        const draft = createBlueprint("reactor", {
            components: { display: { label: "r", display_key: "unknown" } },
        });

        cycleCompiler(draft, baseConfig({ showProgressBar: undefined }));

        // showProgressBar falsy -> appendCycleBar is never called -> no bars.
        expect(draft.components.display?.bars ?? []).toEqual([]);
    });

    it("appends the cycle progress bar when showProgressBar is true", () => {
        const draft = createBlueprint("reactor", {
            components: { display: { label: "r", display_key: "unknown" } },
        });

        cycleCompiler(draft, baseConfig({ showProgressBar: true }));

        // showProgressBar true -> appendCycleBar pushes the cycle bar verbatim.
        expect(draft.components.display?.bars).toEqual([
            {
                key: "state.cycle",
                maxKey: "state.cycle.max",
                color: "hsl(200, 70%, 50%)",
                label: "cycle",
            },
        ]);
    });

    it("emits exactly the cycle.max SET passive effect for a flat (no perBody/multPerBody) maxProgress", () => {
        const draft = createBlueprint("reactor", { components: {} });

        cycleCompiler(
            draft,
            baseConfig({ maxProgress: { base: 10, perBody: 0, multPerBody: 0 } }),
        );

        // Pins the compileScalableValue call args at L44-49: the target string
        // "self.state.cycle.max" and (via the flat path) the base value 10. A
        // wrong target/tempVar string or a dropped SET would change this array.
        expect(draft.components.passiveEffects).toEqual([
            { op: "SET", target: "self.state.cycle.max", value: 10 },
        ]);
    });

    it("emits the perBody scaler passive effects (kills the perBody ?? logical-operator)", () => {
        const draft = createBlueprint("reactor", { components: {} });

        cycleCompiler(
            draft,
            baseConfig({ maxProgress: { base: 42, perBody: 3, multPerBody: 0 } }),
        );

        // normalizeScale must forward perBody:3 (not the 0 default) into the
        // scaler. If `value?.perBody ?? 0` is mutated (e.g. ?? -> &&) perBody
        // collapses to 0, hasAdd becomes false, and the vals_* / ADD effects
        // vanish. The temp-var name "cycle_max_scaler" is pinned by the key.
        expect(draft.components.passiveEffects).toEqual([
            { op: "SET", target: "self.state.cycle.max", value: 42 },
            {
                op: "SET",
                target: "self.state.vals_cycle_max_scaler",
                source: "global.population",
            },
            {
                op: "MULT",
                target: "self.state.vals_cycle_max_scaler",
                value: 3,
            },
            {
                op: "ADD",
                target: "self.state.cycle.max",
                source: "self.state.vals_cycle_max_scaler",
            },
        ]);
        expect(draft.components.state?.vals_cycle_max_scaler).toEqual({
            value: 0,
            visible: false,
        });
    });

    it("emits the multPerBody scaler passive effects (kills the multPerBody ?? logical-operator)", () => {
        const draft = createBlueprint("reactor", { components: {} });

        cycleCompiler(
            draft,
            baseConfig({ maxProgress: { base: 10, perBody: 0, multPerBody: 4 } }),
        );

        // Same as above but for the multPerBody branch: forwards multPerBody:4,
        // appends the `_m` temp var and the final MULT against cycle.max.
        expect(draft.components.passiveEffects).toEqual([
            { op: "SET", target: "self.state.cycle.max", value: 10 },
            {
                op: "SET",
                target: "self.state.vals_cycle_max_scaler_m",
                source: "global.population",
            },
            {
                op: "MULT",
                target: "self.state.vals_cycle_max_scaler_m",
                value: 4,
            },
            {
                op: "MULT",
                target: "self.state.cycle.max",
                source: "self.state.vals_cycle_max_scaler_m",
            },
        ]);
        expect(draft.components.state?.vals_cycle_max_scaler_m).toEqual({
            value: 0,
            visible: false,
        });
    });
});
