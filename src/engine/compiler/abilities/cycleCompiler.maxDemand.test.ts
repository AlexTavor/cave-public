import { describe, it, expect } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";

describe("cycleCompiler — maxDemand", () => {
    it("compiles maxDemand passive effects alongside baseDemand", () => {
        const blueprint = createBlueprint("bp_egg", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
                        costMultPerCycle: 0,
                        inputs: {
                            body: { base: 1, perBody: 0, multPerBody: 0 },
                            mind: { base: 1, perBody: 0, multPerBody: 0 },
                            social: { base: 1, perBody: 0, multPerBody: 0 },
                        },
                        oneOff: true,
                        conditions: [],
                    },
                },
            },
        });

        const compiled = new CompilerService().compile(blueprint);
        const effects = compiled.components.passiveEffects ?? [];
        const baseEffects = effects.filter(
            (e) =>
                typeof e.target === "string" && e.target.includes("baseDemand"),
        );
        const maxEffects = effects.filter(
            (e) =>
                typeof e.target === "string" && e.target.includes("maxDemand"),
        );

        // Each attribute (body, mind, social) should have both
        expect(baseEffects).toHaveLength(3);
        expect(maxEffects).toHaveLength(3);
    });

    it("compiles powerSink with zero initial demands", () => {
        const blueprint = createBlueprint("bp_egg", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
                        costMultPerCycle: 0,
                        inputs: {
                            body: { base: 2, perBody: 0, multPerBody: 0 },
                        },
                        oneOff: false,
                        conditions: [],
                    },
                },
            },
        });

        const compiled = new CompilerService().compile(blueprint);
        const sink = compiled.components.powerSink;

        expect(sink).toBeDefined();
        expect(sink?.baseDemand).toEqual({ body: 0, mind: 0, social: 0 });
        expect(sink?.maxDemand).toEqual({ body: 0, mind: 0, social: 0 });
    });
});
