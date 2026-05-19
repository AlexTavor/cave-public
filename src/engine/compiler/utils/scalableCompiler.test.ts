import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import { compileScalableValue } from "./scalableCompiler";
import { Op } from "../../../data/schemas/primitives";

describe("compileScalableValue", () => {
    it("uses global population for per-body scaling", () => {
        const draft = createBlueprint("cycler", { components: {} });

        compileScalableValue(
            draft,
            { base: 5, perBody: 10, multPerBody: 0 },
            "self.state.cycle.max",
            "cycle_max",
        );

        const effects = draft.components.passiveEffects ?? [];
        expect(
            effects.some((effect) => effect.source === "global.population"),
        ).toBe(true);
        expect(draft.components.state?.vals_cycle_max).toBeTruthy();
    });

    it("emits MULT effects for multPerBody scaling", () => {
        const draft = createBlueprint("cycler", { components: {} });

        compileScalableValue(
            draft,
            { base: 5, perBody: 0, multPerBody: 2 },
            "self.state.cycle.max",
            "cycle_max",
        );

        const effects = draft.components.passiveEffects ?? [];
        const multEffects = effects.filter((e) => e.op === Op.MULT);
        expect(multEffects.length).toBeGreaterThanOrEqual(2);
        expect(draft.components.state?.vals_cycle_max_m).toBeTruthy();
    });

    it("emits both ADD and MULT effects when both are set", () => {
        const draft = createBlueprint("cycler", { components: {} });

        compileScalableValue(
            draft,
            { base: 1, perBody: 1, multPerBody: 1 },
            "self.state.cycle.max",
            "sc",
        );

        const effects = draft.components.passiveEffects ?? [];
        const setEffects = effects.filter((e) => e.op === Op.SET);
        const addEffects = effects.filter((e) => e.op === Op.ADD);
        const multEffects = effects.filter((e) => e.op === Op.MULT);

        expect(setEffects.length).toBe(3);
        expect(addEffects.length).toBe(1);
        expect(multEffects.length).toBe(3);
        expect(draft.components.state?.vals_sc).toBeTruthy();
        expect(draft.components.state?.vals_sc_m).toBeTruthy();
    });

    it("sets initial value for zero-scaling state targets", () => {
        const draft = createBlueprint("cycler", { components: {} });

        compileScalableValue(
            draft,
            { base: 50, perBody: 0, multPerBody: 0 },
            "self.state.cycle.max",
            "cycle_max",
        );

        const effects = draft.components.passiveEffects ?? [];
        expect(effects).toEqual([
            { op: Op.SET, target: "self.state.cycle.max", value: 50 },
        ]);
        expect((draft.components.state?.cycle as any)?.max).toBe(50);
    });
});

