import { describe, it, expect } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";

const makeCycleBlueprint = (
    cycle: Record<string, unknown>,
) =>
    createBlueprint("bp_test", {
        components: {},
        _editor: { abilities: { cycle } as any },
    });

const compile = (bp: ReturnType<typeof createBlueprint>) =>
    new CompilerService().compile(bp);

describe("cycleCompiler — startActive", () => {
    it("sets throttle to 0 when startActive is false (default)", () => {
        const compiled = compile(
            makeCycleBlueprint({
                maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
                inputs: { body: { base: 1, perBody: 0, multPerBody: 0 } },
                oneOff: false,
                conditions: [],
            }),
        );

        expect(compiled.components.powerSink?.throttle).toBe(0);
    });

    it("sets throttle to 1 when startActive is true", () => {
        const compiled = compile(
            makeCycleBlueprint({
                maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
                inputs: { body: { base: 1, perBody: 0, multPerBody: 0 } },
                oneOff: false,
                startActive: true,
                conditions: [],
            }),
        );

        expect(compiled.components.powerSink?.throttle).toBe(1);
    });
});

describe("cycleCompiler — scaleOnMaxChange", () => {
    it("sets scaleOnMaxChange on cycle state entry", () => {
        const compiled = compile(
            makeCycleBlueprint({
                maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
                inputs: {},
                oneOff: false,
                conditions: [],
            }),
        );

        const cycleState = compiled.components.state?.cycle as any;
        expect(cycleState?.scaleOnMaxChange).toBe(true);
    });
});
