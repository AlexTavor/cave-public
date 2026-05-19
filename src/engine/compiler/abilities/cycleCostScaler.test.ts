import { describe, it, expect } from "vitest";
import { compileCycleCostScaler } from "./cycleCostScaler";
import { createBlueprint } from "../../test/factories";
import type { Blueprint } from "../../../data/schemas/blueprint";

const makeDraft = (): Blueprint => {
    const bp = createBlueprint("test", { components: {} });
    bp.components.state = {
        cycle: { value: 0, max: 100, visible: true },
    };
    bp.components.passiveEffects = [];
    return bp;
};

describe("compileCycleCostScaler", () => {
    it("creates cycle_count state initialised to 1", () => {
        const draft = makeDraft();
        compileCycleCostScaler(draft, 1);
        expect((draft.components.state as any).cycle_count.value).toBe(1);
    });

    it("initialises vals_cycle_cost_scaler to costMultPerCycle", () => {
        const draft = makeDraft();
        compileCycleCostScaler(draft, 0.5);
        const vals = (draft.components.state as any).vals_cycle_cost_scaler;
        expect(vals.value).toBe(0.5);
    });

    it("adds three passive effects: SET, MULT constant, MULT cycle.max", () => {
        const draft = makeDraft();
        compileCycleCostScaler(draft, 0.5);
        const effects = draft.components.passiveEffects!;
        const setOp = effects.find(
            (e) => e.op === "SET" && e.source === "self.state.cycle_count",
        );
        const multConst = effects.find(
            (e) => e.op === "MULT" && e.value === 0.5,
        );
        const multMax = effects.find(
            (e) => e.op === "MULT" && e.target === "self.state.cycle.max",
        );
        expect(setOp).toBeDefined();
        expect(multConst).toBeDefined();
        expect(multMax).toBeDefined();
    });

    it("stores costMultPerCycle as the MULT constant (not base*costMult)", () => {
        const draft = makeDraft();
        compileCycleCostScaler(draft, 0.25);
        const effects = draft.components.passiveEffects!;
        const multConst = effects.find(
            (e) => e.op === "MULT" && typeof e.value === "number",
        );
        expect(multConst?.value).toBe(0.25);
    });
});
