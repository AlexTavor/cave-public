import { describe, it, expect } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";
import { compileAccumulation } from "./cycleCompilerAccum";
import type { Blueprint } from "../../../data/schemas/blueprint";
import type { CycleAbilityConfig } from "../../../data/schemas/abilities/cycle";
import type { BehaviorRule } from "../../../data/schemas/behavior";
import type { MutateAction } from "../../../data/schemas/behavior";
import type { LogicRule } from "../../../data/schemas/logic";

const makeCycleBlueprint = (id: string, cycle: Record<string, unknown>) =>
    createBlueprint(id, {
        components: {},
        _editor: { abilities: { cycle: cycle as unknown as CycleAbilityConfig } },
    });

const compile = (bp: ReturnType<typeof createBlueprint>) =>
    new CompilerService().compile(bp);

const findRule = (rules: BehaviorRule[], id: string) =>
    rules.find((r: BehaviorRule) => r.id === id);

// A bare draft so compileAccumulation can be exercised directly (no full
// CompilerService pipeline) for exact structural assertions.
const makeDraft = (id = "bp_accum"): Blueprint =>
    createBlueprint(id, { components: {} });

describe("cycleCompiler accumulation", () => {
    it("uses global.dt_s for accumulation expression", () => {
        const bp = makeCycleBlueprint("bp_mine", {
            maxProgress: { base: 10, perBody: 0, multPerBody: 0 },
            inputs: { body: { base: 1, perBody: 0, multPerBody: 0 } },
            oneOff: false,
            conditions: [],
        });
        const rules = compile(bp).components.behavior?.rules ?? [];
        const accumulate = findRule(rules, "sys_cycle_accumulate");
        const action = accumulate?.actions[0] as MutateAction | undefined;

        expect(action?.type).toBe("MUTATE");
        expect(action?.value).toContain("global.dt_s");
        expect(action?.value).not.toContain("global.dt ");
    });

    it("accumulation uses allocatedDraw, not baseDemand", () => {
        const bp = makeCycleBlueprint("bp_worker", {
            maxProgress: { base: 10, perBody: 0, multPerBody: 0 },
            inputs: {
                body: { base: 5, perBody: 0, multPerBody: 0 },
                mind: { base: 3, perBody: 0, multPerBody: 0 },
            },
            oneOff: false,
            conditions: [],
        });
        const rules = compile(bp).components.behavior?.rules ?? [];
        const accumulate = findRule(rules, "sys_cycle_accumulate");
        const expr = String(
            (accumulate?.actions[0] as MutateAction | undefined)?.value,
        );

        expect(expr).toContain("self.powerSink.allocatedDraw.body");
        expect(expr).toContain("self.powerSink.allocatedDraw.mind");
        expect(expr).not.toContain("baseDemand");
        expect(expr).not.toContain("drawFraction");
    });

    it("emits the full demand passiveEffects + accumulate rule for a single static input", () => {
        const draft = makeDraft("bp_single");
        const config: CycleAbilityConfig = {
            maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
            inputs: { body: { base: 4, perBody: 0, multPerBody: 0 } },
            oneOff: false,
            conditions: [],
        };

        compileAccumulation(draft, config);

        // Both baseDemand and maxDemand are emitted as SET passive effects with
        // the normalized base value (4). Target paths + value are load-bearing.
        expect(draft.components.passiveEffects).toEqual([
            { op: "SET", target: "self.powerSink.baseDemand.body", value: 4 },
            { op: "SET", target: "self.powerSink.maxDemand.body", value: 4 },
        ]);

        // Exactly one accumulate rule, fully structured.
        expect(draft.components.behavior?.rules).toEqual([
            {
                id: "sys_cycle_accumulate",
                sortKey: "sys_001",
                conditions: [
                    {
                        id: "is_active",
                        sortKey: "0",
                        tokens: [{ t: "ref", v: "self.state.cycle_active" }],
                    },
                ],
                actions: [
                    {
                        type: "MUTATE",
                        target: "self.state.cycle.value",
                        op: "ADD",
                        value: "(self.powerSink.allocatedDraw.body) * global.dt_s",
                    },
                ],
            },
        ]);
    });

    it("joins multiple allocatedDraw inputs with ' + ' inside the accumulate expression", () => {
        const draft = makeDraft("bp_multi");
        const config: CycleAbilityConfig = {
            maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
            inputs: {
                body: { base: 1, perBody: 0, multPerBody: 0 },
                mind: { base: 1, perBody: 0, multPerBody: 0 },
            },
            oneOff: false,
            conditions: [],
        };

        compileAccumulation(draft, config);

        const accumulate = findRule(
            draft.components.behavior?.rules ?? [],
            "sys_cycle_accumulate",
        );
        // Order follows Object.entries(inputs): body then mind, joined by " + ".
        expect(
            (accumulate?.actions[0] as MutateAction | undefined)?.value,
        ).toBe(
            "(self.powerSink.allocatedDraw.body + self.powerSink.allocatedDraw.mind) * global.dt_s",
        );
    });

    it("normalizes a per-body / mult-per-body scale through to the demand scaler effects", () => {
        const draft = makeDraft("bp_scaled");
        const config: CycleAbilityConfig = {
            maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
            // base present, perBody and multPerBody non-zero -> exercises the
            // add + mult scaling branches and proves normalizeScale forwards
            // base/perBody/multPerBody exactly (kills the ?? 0 defaults).
            inputs: { body: { base: 2, perBody: 3, multPerBody: 5 } },
            oneOff: false,
            conditions: [],
        };

        compileAccumulation(draft, config);

        expect(draft.components.passiveEffects).toEqual([
            // baseDemand scaler: SET base, then +population*perBody, then *population*multPerBody
            {
                op: "SET",
                target: "self.powerSink.baseDemand.body",
                value: 2,
            },
            {
                op: "SET",
                target: "self.state.vals_demand_body_scaler",
                source: "global.population",
            },
            {
                op: "MULT",
                target: "self.state.vals_demand_body_scaler",
                value: 3,
            },
            {
                op: "ADD",
                target: "self.powerSink.baseDemand.body",
                source: "self.state.vals_demand_body_scaler",
            },
            {
                op: "SET",
                target: "self.state.vals_demand_body_scaler_m",
                source: "global.population",
            },
            {
                op: "MULT",
                target: "self.state.vals_demand_body_scaler_m",
                value: 5,
            },
            {
                op: "MULT",
                target: "self.powerSink.baseDemand.body",
                source: "self.state.vals_demand_body_scaler_m",
            },
            // maxDemand scaler reuses demand_max_body_scaler key
            {
                op: "SET",
                target: "self.powerSink.maxDemand.body",
                value: 2,
            },
            {
                op: "SET",
                target: "self.state.vals_demand_max_body_scaler",
                source: "global.population",
            },
            {
                op: "MULT",
                target: "self.state.vals_demand_max_body_scaler",
                value: 3,
            },
            {
                op: "ADD",
                target: "self.powerSink.maxDemand.body",
                source: "self.state.vals_demand_max_body_scaler",
            },
            {
                op: "SET",
                target: "self.state.vals_demand_max_body_scaler_m",
                source: "global.population",
            },
            {
                op: "MULT",
                target: "self.state.vals_demand_max_body_scaler_m",
                value: 5,
            },
            {
                op: "MULT",
                target: "self.powerSink.maxDemand.body",
                source: "self.state.vals_demand_max_body_scaler_m",
            },
        ]);
    });

    it("defaults a missing scale's base/perBody/multPerBody to 0 (empty input object)", () => {
        const draft = makeDraft("bp_empty_scale");
        const config: CycleAbilityConfig = {
            maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
            // body present but an EMPTY object: normalizeScale must fill 0s.
            inputs: { body: {} },
            oneOff: false,
            conditions: [],
        };

        compileAccumulation(draft, config);

        // All defaults 0 -> no add/mult branch, just two SET-to-0 demand effects.
        expect(draft.components.passiveEffects).toEqual([
            { op: "SET", target: "self.powerSink.baseDemand.body", value: 0 },
            { op: "SET", target: "self.powerSink.maxDemand.body", value: 0 },
        ]);
    });

    it("pushes the is_depleted condition onto the cycle rule when oneOff is true", () => {
        const draft = makeDraft("bp_oneoff");
        const config: CycleAbilityConfig = {
            maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
            inputs: { body: { base: 1, perBody: 0, multPerBody: 0 } },
            oneOff: true,
            conditions: [],
        };

        compileAccumulation(draft, config);

        const accumulate = findRule(
            draft.components.behavior?.rules ?? [],
            "sys_cycle_accumulate",
        );
        // is_active (from createCycleRule) + the appended depletion gate.
        expect(accumulate?.conditions).toEqual([
            {
                id: "is_active",
                sortKey: "0",
                tokens: [{ t: "ref", v: "self.state.cycle_active" }],
            },
            {
                id: "is_depleted",
                sortKey: "1",
                tokens: [
                    { t: "ref", v: "self.state.is_depleted.value" },
                    { t: "op", v: "==" },
                    { t: "val", v: 0 },
                ],
            },
        ]);
    });

    it("does NOT push the is_depleted condition when oneOff is false", () => {
        const draft = makeDraft("bp_not_oneoff");
        const config: CycleAbilityConfig = {
            maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
            inputs: { body: { base: 1, perBody: 0, multPerBody: 0 } },
            oneOff: false,
            conditions: [],
        };

        compileAccumulation(draft, config);

        const accumulate = findRule(
            draft.components.behavior?.rules ?? [],
            "sys_cycle_accumulate",
        );
        expect(accumulate?.conditions).toHaveLength(1);
        expect(
            accumulate?.conditions.some((c: LogicRule) => c.id === "is_depleted"),
        ).toBe(false);
    });

    it("appends authored cycle conditions via the '<id>:cycle' context label", () => {
        const draft = makeDraft("bp_authored");
        const config: CycleAbilityConfig = {
            maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
            inputs: { body: { base: 1, perBody: 0, multPerBody: 0 } },
            oneOff: false,
            conditions: ["self.state.cycle.value > 0"],
        };

        compileAccumulation(draft, config);

        const accumulate = findRule(
            draft.components.behavior?.rules ?? [],
            "sys_cycle_accumulate",
        );
        // appendRuleConditions ids the appended gate as gate_<ruleId>_<index>.
        const gate = accumulate?.conditions.find(
            (c: LogicRule) => c.id === "gate_sys_cycle_accumulate_0",
        );
        expect(gate).toBeDefined();
        expect(gate?.tokens.length).toBeGreaterThan(0);
    });

    it("does nothing (no behavior, no passiveEffects) when inputs are empty", () => {
        const draft = makeDraft("bp_noinput");
        const config: CycleAbilityConfig = {
            maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
            inputs: {},
            oneOff: false,
            conditions: [],
        };

        compileAccumulation(draft, config);

        // No accumulationParts -> early return before behavior is created.
        expect(draft.components.behavior).toBeUndefined();
        expect(draft.components.passiveEffects).toBeUndefined();
    });

    it("treats undefined inputs as empty (no rule emitted)", () => {
        const draft = makeDraft("bp_undefinput");
        compileAccumulation(draft, {
            maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
            oneOff: false,
            conditions: [],
        } as never);

        expect(draft.components.behavior).toBeUndefined();
    });

    it("skips a falsy scale entry but still processes a valid sibling input", () => {
        const draft = makeDraft("bp_falsy");
        compileAccumulation(draft, {
            maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
            // `mind` is explicitly undefined -> `if (!scaleConfig) continue`.
            inputs: {
                mind: undefined,
                body: { base: 1, perBody: 0, multPerBody: 0 },
            },
            oneOff: false,
            conditions: [],
        } as never);

        const accumulate = findRule(
            draft.components.behavior?.rules ?? [],
            "sys_cycle_accumulate",
        );
        // Only body contributes; mind was skipped.
        const accumValue = (accumulate?.actions[0] as MutateAction | undefined)
            ?.value;
        expect(accumValue).toBe("(self.powerSink.allocatedDraw.body) * global.dt_s");
        expect(accumValue).not.toContain("mind");
    });

    it("reuses an existing behavior.rules array rather than replacing it", () => {
        const existingRule = {
            id: "sys_preexisting",
            sortKey: "sys_000",
            conditions: [],
            actions: [],
        };
        const draft = createBlueprint("bp_existing", {
            components: { behavior: { rules: [existingRule] } },
        });

        compileAccumulation(draft, {
            maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
            inputs: { body: { base: 1, perBody: 0, multPerBody: 0 } },
            oneOff: false,
            conditions: [],
        } as never);

        const ids = draft.components.behavior?.rules?.map((r: BehaviorRule) => r.id);
        expect(ids).toEqual(["sys_preexisting", "sys_cycle_accumulate"]);
    });
});
