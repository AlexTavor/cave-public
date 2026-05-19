import { describe, it, expect } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";

describe("samplerCompiler", () => {
    it("injects sampled state and sync actions", () => {
        const blueprint = createBlueprint("bp_sampler", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 1, perBody: 0, multPerBody: 0 },
                        costMultPerCycle: 0,
                        inputs: {},
                        oneOff: false,
                        conditions: [],
                    },
                    sampler: [
                        {
                            source: "sys_world.state.notoriety.value",
                            visible: true,
                            target: "sampled_value",
                            max: 100,
                        },
                    ],
                },
            },
        });

        const compiled = new CompilerService().compile(blueprint);
        const state = compiled.components.state ?? {};
        expect(state.sampled_notoriety).toEqual({
            value: 0,
            visible: true,
            max: 100,
        });

        const rules = compiled.components.behavior?.rules ?? [];
        const samplerRule = rules.find((rule) =>
            rule.id.startsWith("sys_sampler_"),
        );

        expect(samplerRule?.actions).toHaveLength(2);
        expect(samplerRule?.actions[0]).toEqual({
            type: "MUTATE",
            target: "self.state.sampled_notoriety.value",
            op: "SET",
            value: "sys_world.state.notoriety.value",
        });
    });

    it("skips max sync when source is not a value path", () => {
        const blueprint = createBlueprint("bp_sampler", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 1, perBody: 0, multPerBody: 0 },
                        costMultPerCycle: 0,
                        inputs: {},
                        oneOff: false,
                        conditions: [],
                    },
                    sampler: [
                        {
                            source: "global.heat",
                            visible: false,
                            target: "sampled_value",
                            max: 50,
                        },
                    ],
                },
            },
        });

        const compiled = new CompilerService().compile(blueprint);
        const rules = compiled.components.behavior?.rules ?? [];
        const samplerRule = rules.find((rule) =>
            rule.actions.some((action) => action.type === "MUTATE"),
        );

        expect(samplerRule?.actions).toHaveLength(1);
    });
});
