import { describe, it, expect } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";

const makeCycleBlueprint = (cycle: Record<string, unknown>) =>
    createBlueprint("bp", {
        components: {},
        _editor: { abilities: { cycle } as any },
    });

const compile = (bp: ReturnType<typeof createBlueprint>) =>
    new CompilerService().compile(bp);

const findRule = (rules: any[], id: string) =>
    rules.find((r: any) => r.id === id);

describe("cycleCompiler costMultPerCycle", () => {
    it("creates cycle_count state when costMultPerCycle > 0", () => {
        const bp = makeCycleBlueprint({
            maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
            inputs: { body: { base: 1, perBody: 0, multPerBody: 0 } },
            costMultPerCycle: 1,
            oneOff: false,
            conditions: [],
        });
        const compiled = compile(bp);
        const state = compiled.components.state as any;
        expect(state.cycle_count).toEqual({ value: 1, visible: false });
    });

    it("adds cycle_count increment to the reset rule", () => {
        const bp = makeCycleBlueprint({
            maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
            inputs: { body: { base: 1, perBody: 0, multPerBody: 0 } },
            costMultPerCycle: 0.5,
            oneOff: false,
            conditions: [],
        });
        const rules = compile(bp).components.behavior?.rules ?? [];
        const reset = findRule(rules, "sys_cycle_reset");
        const increment = reset?.actions.find(
            (a: any) =>
                a.type === "MUTATE" &&
                a.target === "self.state.cycle_count.value" &&
                a.op === "ADD",
        );
        expect(increment?.value).toBe(1);
    });

    it("adds passive effects multiplying cycle.max by cost scaler", () => {
        const bp = makeCycleBlueprint({
            maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
            inputs: {},
            costMultPerCycle: 1,
            oneOff: false,
            conditions: [],
        });
        const compiled = compile(bp);
        const effects = compiled.components.passiveEffects ?? [];
        const multEffect = effects.find(
            (e: any) => e.op === "MULT" && e.target === "self.state.cycle.max",
        );
        expect(multEffect).toBeDefined();
    });

    it("does not create cycle_count when costMultPerCycle is 0", () => {
        const bp = makeCycleBlueprint({
            maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
            inputs: {},
            costMultPerCycle: 0,
            oneOff: false,
            conditions: [],
        });
        const compiled = compile(bp);
        const state = compiled.components.state as any;
        expect(state.cycle_count).toBeUndefined();
    });
});
