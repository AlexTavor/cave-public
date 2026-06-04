import { describe, expect, it } from "vitest";
import type { Blueprint } from "../../../data/schemas/blueprint";
import type { CycleResourceCostConfig } from "../../../data/schemas/abilities/cycle";
import { Op } from "../../../data/schemas/primitives";
import { DisplayPaletteKey } from "../../../lib/displays/displayKeyKinds";
import {
    compileCycleCostRow,
    type CostGroup,
} from "./cycleResourceCostCompileRow";

// A bare draft with no state / passiveEffects so the nullish-coalescing
// initialisers in compileCycleCostRow are exercised.
const bareDraft = (id = "forge"): Blueprint =>
    ({ id, label: id, tags: [], components: {} }) as Blueprint;

const cost = (
    overrides: Partial<CycleResourceCostConfig> = {},
): CycleResourceCostConfig => ({
    resource: "food",
    amount: { base: 5, perBody: 0, multPerBody: 0 },
    scaleByBodiesOwned: false,
    scaleByCyclesCompleted: false,
    visible: true,
    priority: 0,
    ...overrides,
});

describe("compileCycleCostRow", () => {
    it("compiles a single non-scaled row end-to-end: state, passiveEffect, and group (deep-equal)", () => {
        const draft = bareDraft();
        const groups = new Map<string, CostGroup>();

        compileCycleCostRow(draft, cost(), 0, groups);

        expect(draft.components).toEqual({
            state: {
                // ensureStateEntry seeds the final key with the {0,false} default
                vals_cycle_cost_food_0: { value: 0, visible: false },
                // base key is overwritten by the non-scaled base amount
                vals_cycle_cost_base_food_0: { value: 5, visible: false },
            },
            passiveEffects: [
                {
                    op: Op.SET,
                    target: "self.state.vals_cycle_cost_food_0.value",
                    source: "self.state.vals_cycle_cost_base_food_0.value",
                },
            ],
        });

        expect(groups.get("food")).toEqual({
            amountRefs: ["self.state.vals_cycle_cost_food_0.value"],
            priority: 0,
            visible: true,
            barPosition: undefined,
            barColorHex: undefined,
            barPaletteColorKey: undefined,
            requestPerSecondAtFullThrottle: 999999,
            requestCadenceSeconds: 1,
            requestIndex: 0,
        });
    });

    it("carries bar metadata and request overrides into the new group (deep-equal)", () => {
        const draft = bareDraft();
        const groups = new Map<string, CostGroup>();

        compileCycleCostRow(
            draft,
            cost({
                priority: 3,
                barPosition: "bottom_right",
                barColorHex: "#abcdef",
                barPaletteColorKey: DisplayPaletteKey.Gold,
                requestPerSecondAtFullThrottle: 4,
                requestCadenceSeconds: 2,
            }),
            1,
            groups,
        );

        expect(groups.get("food")).toEqual({
            amountRefs: ["self.state.vals_cycle_cost_food_1.value"],
            priority: 3,
            visible: true,
            barPosition: "bottom_right",
            barColorHex: "#abcdef",
            barPaletteColorKey: "gold",
            requestPerSecondAtFullThrottle: 4,
            requestCadenceSeconds: 2,
            requestIndex: 1,
        });
    });

    it("returns early without mutating the draft when resource is whitespace-only", () => {
        const draft = bareDraft();
        const groups = new Map<string, CostGroup>();

        compileCycleCostRow(draft, cost({ resource: "   " }), 0, groups);

        // The nullish initialisers run first, THEN resource.trim() is falsy ->
        // early return before any cost keys/effects are added.
        expect(draft.components).toEqual({ state: {}, passiveEffects: [] });
        expect(groups.size).toBe(0);
    });

    it("returns early when resource is undefined (optional chaining guard)", () => {
        const draft = bareDraft();
        const groups = new Map<string, CostGroup>();

        compileCycleCostRow(
            draft,
            cost({ resource: undefined as unknown as string }),
            0,
            groups,
        );

        expect(draft.components).toEqual({ state: {}, passiveEffects: [] });
        expect(groups.size).toBe(0);
    });

    it("trims surrounding whitespace from the resource for state keys and group identity", () => {
        const draft = bareDraft();
        const groups = new Map<string, CostGroup>();

        compileCycleCostRow(draft, cost({ resource: "  food  " }), 0, groups);

        // The key helpers normalize (trim) the resource.
        expect(draft.components.state).toHaveProperty("vals_cycle_cost_food_0");
        expect(groups.has("food")).toBe(true);
    });

    it("writes the non-scaled base amount as a state entry with visible:false (base default 0 when amount missing)", () => {
        const draft = bareDraft();
        const groups = new Map<string, CostGroup>();

        compileCycleCostRow(
            draft,
            cost({ amount: undefined as unknown as CycleResourceCostConfig["amount"] }),
            0,
            groups,
        );

        expect(draft.components.state?.vals_cycle_cost_base_food_0).toEqual({
            value: 0,
            visible: false,
        });
    });

    it("compiles the scale-by-bodies branch into scalable passive effects + temp state", () => {
        const draft = bareDraft();
        const groups = new Map<string, CostGroup>();

        compileCycleCostRow(
            draft,
            cost({
                scaleByBodiesOwned: true,
                amount: { base: 2, perBody: 3, multPerBody: 0 },
            }),
            0,
            groups,
        );

        // scaleByBodiesOwned -> compileScalableValue path. With perBody != 0 it
        // seeds the temp key `vals_cycle_cost_0` and emits SET/MULT/ADD effects.
        expect(draft.components.state).toHaveProperty("vals_cycle_cost_0");
        expect(draft.components.passiveEffects).toEqual([
            // final = base (SET via conversion effect ordering)
            {
                op: Op.SET,
                target: "self.state.vals_cycle_cost_base_food_0.value",
                value: 2,
            },
            {
                op: Op.SET,
                target: "self.state.vals_cycle_cost_0",
                source: "global.population",
            },
            {
                op: Op.MULT,
                target: "self.state.vals_cycle_cost_0",
                value: 3,
            },
            {
                op: Op.ADD,
                target: "self.state.vals_cycle_cost_base_food_0.value",
                source: "self.state.vals_cycle_cost_0",
            },
            {
                op: Op.SET,
                target: "self.state.vals_cycle_cost_food_0.value",
                source: "self.state.vals_cycle_cost_base_food_0.value",
            },
        ]);
        // NOT the plain non-scaled base-state shape.
        expect(
            draft.components.state?.vals_cycle_cost_base_food_0,
        ).toEqual({ value: 0, visible: false });
    });

    it("adds cycle-count tracking + a MULT effect when scaleByCyclesCompleted is true", () => {
        const draft = bareDraft();
        const groups = new Map<string, CostGroup>();

        compileCycleCostRow(
            draft,
            cost({ scaleByCyclesCompleted: true }),
            0,
            groups,
        );

        // cycle_count state seeded by ensureCycleCountTracking.
        expect(draft.components.state?.cycle_count).toEqual({
            value: 1,
            visible: false,
        });
        // A MULT-by-cycle_count effect is appended after the SET.
        expect(draft.components.passiveEffects).toEqual([
            {
                op: Op.SET,
                target: "self.state.vals_cycle_cost_food_0.value",
                source: "self.state.vals_cycle_cost_base_food_0.value",
            },
            {
                op: Op.MULT,
                target: "self.state.vals_cycle_cost_food_0.value",
                source: "self.state.cycle_count.value",
            },
        ]);
    });

    it("does NOT add cycle-count tracking or a MULT effect when scaleByCyclesCompleted is false", () => {
        const draft = bareDraft();
        const groups = new Map<string, CostGroup>();

        compileCycleCostRow(
            draft,
            cost({ scaleByCyclesCompleted: false }),
            0,
            groups,
        );

        expect(draft.components.state?.cycle_count).toBeUndefined();
        expect(
            draft.components.passiveEffects?.some((e) => e.op === Op.MULT),
        ).toBe(false);
    });

    it("sets group.visible=false only when the row explicitly sets visible:false", () => {
        const draft = bareDraft();
        const groups = new Map<string, CostGroup>();

        compileCycleCostRow(draft, cost({ visible: false }), 0, groups);

        // visible !== false is false -> group.visible stays false.
        expect(groups.get("food")?.visible).toBe(false);
    });

    it("a visible:true row flips an existing invisible group to visible (||=)", () => {
        const draft = bareDraft();
        const existing: CostGroup = {
            amountRefs: ["self.state.vals_cycle_cost_food_0.value"],
            priority: 0,
            visible: false,
            requestPerSecondAtFullThrottle: 999999,
            requestCadenceSeconds: 1,
            requestIndex: 0,
        };
        const groups = new Map<string, CostGroup>([["food", existing]]);

        compileCycleCostRow(draft, cost({ visible: true }), 1, groups);

        expect(groups.get("food")?.visible).toBe(true);
    });

    it("merges a second row into the existing group: appends amountRef and takes the max priority", () => {
        const draft = bareDraft();
        const groups = new Map<string, CostGroup>();

        compileCycleCostRow(draft, cost({ priority: 2 }), 0, groups);
        compileCycleCostRow(draft, cost({ priority: 5 }), 1, groups);

        const group = groups.get("food");
        expect(group?.amountRefs).toEqual([
            "self.state.vals_cycle_cost_food_0.value",
            "self.state.vals_cycle_cost_food_1.value",
        ]);
        // Math.max(2, 5) -> 5.
        expect(group?.priority).toBe(5);
        // requestIndex stays at the first row's index.
        expect(group?.requestIndex).toBe(0);
    });

    it("keeps the higher existing priority when a later row has a lower priority (Math.max)", () => {
        const draft = bareDraft();
        const groups = new Map<string, CostGroup>();

        compileCycleCostRow(draft, cost({ priority: 9 }), 0, groups);
        compileCycleCostRow(draft, cost({ priority: 1 }), 1, groups);

        // Math.max(9, 1) -> 9 (a min() mutant would give 1).
        expect(groups.get("food")?.priority).toBe(9);
    });

    it("throws a descriptive error when a same-resource row disagrees on request cadence", () => {
        const draft = bareDraft();
        const groups = new Map<string, CostGroup>();

        compileCycleCostRow(
            draft,
            cost({ requestCadenceSeconds: 1 }),
            0,
            groups,
        );

        expect(() =>
            compileCycleCostRow(
                draft,
                cost({ requestCadenceSeconds: 2 }),
                3,
                groups,
            ),
        ).toThrow(
            "cycle resource cost request mismatch in 'forge' for 'food' between rows 0 and 3",
        );
    });

    it("throws when a same-resource row disagrees on request-per-second", () => {
        const draft = bareDraft();
        const groups = new Map<string, CostGroup>();

        compileCycleCostRow(
            draft,
            cost({ requestPerSecondAtFullThrottle: 10 }),
            0,
            groups,
        );

        expect(() =>
            compileCycleCostRow(
                draft,
                cost({ requestPerSecondAtFullThrottle: 20 }),
                1,
                groups,
            ),
        ).toThrow(/request mismatch/);
    });

    it("does NOT throw when a same-resource row matches the existing request config", () => {
        const draft = bareDraft();
        const groups = new Map<string, CostGroup>();

        compileCycleCostRow(
            draft,
            cost({
                requestPerSecondAtFullThrottle: 7,
                requestCadenceSeconds: 4,
            }),
            0,
            groups,
        );

        // Same request config on both rows -> assertMatchingRequestConfig returns
        // the request and the group is reused.
        expect(() =>
            compileCycleCostRow(
                draft,
                cost({
                    requestPerSecondAtFullThrottle: 7,
                    requestCadenceSeconds: 4,
                }),
                1,
                groups,
            ),
        ).not.toThrow();
        expect(groups.get("food")?.amountRefs).toHaveLength(2);
    });

    it("initialises components.state/passiveEffects on a draft that has neither", () => {
        const draft = bareDraft();
        const groups = new Map<string, CostGroup>();

        compileCycleCostRow(draft, cost(), 0, groups);

        expect(Array.isArray(draft.components.passiveEffects)).toBe(true);
        expect(typeof draft.components.state).toBe("object");
    });
});
