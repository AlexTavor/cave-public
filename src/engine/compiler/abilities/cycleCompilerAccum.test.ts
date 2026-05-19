import { describe, it, expect } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";

const makeCycleBlueprint = (id: string, cycle: Record<string, unknown>) =>
    createBlueprint(id, {
        components: {},
        _editor: { abilities: { cycle } as any },
    });

const compile = (bp: ReturnType<typeof createBlueprint>) =>
    new CompilerService().compile(bp);

const findRule = (rules: any[], id: string) =>
    rules.find((r: any) => r.id === id);

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
        const action = accumulate?.actions[0];

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
        const expr = String(accumulate?.actions[0]?.value);

        expect(expr).toContain("self.powerSink.allocatedDraw.body");
        expect(expr).toContain("self.powerSink.allocatedDraw.mind");
        expect(expr).not.toContain("baseDemand");
        expect(expr).not.toContain("drawFraction");
    });
});
