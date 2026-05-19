import { describe, it, expect } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";

describe("cycleCompiler — showProgressBar", () => {
    it("adds a cycle bar when showProgressBar is true", () => {
        const blueprint = createBlueprint("bp_gen", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 50, perBody: 0, multPerBody: 0 },
                        costMultPerCycle: 0,
                        inputs: {
                            body: { base: 1, perBody: 0, multPerBody: 0 },
                        },
                        oneOff: false,
                        showProgressBar: true,
                        conditions: [],
                    },
                    passport: {
                        label: "Gen",
                        icon: "cog",
                    },
                    worldPresence: {
                        x: 0,
                        y: 0,
                        radius: { min: 10, max: 20 },
                    },
                },
            },
        });

        const compiled = new CompilerService().compile(blueprint);
        const bars = compiled.components.display?.bars ?? [];
        const cycleBar = bars.find((b) => b.key === "state.cycle");

        expect(cycleBar).toBeDefined();
        expect(cycleBar?.maxKey).toBe("state.cycle.max");
        expect(cycleBar?.label).toBe("cycle");
    });

    it("omits cycle bar when showProgressBar is false", () => {
        const blueprint = createBlueprint("bp_gen", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 50, perBody: 0, multPerBody: 0 },
                        costMultPerCycle: 0,
                        inputs: {
                            body: { base: 1, perBody: 0, multPerBody: 0 },
                        },
                        oneOff: false,
                        showProgressBar: false,
                        conditions: [],
                    },
                    passport: {
                        label: "Gen",
                        icon: "cog",
                    },
                    worldPresence: {
                        x: 0,
                        y: 0,
                        radius: { min: 10, max: 20 },
                    },
                },
            },
        });

        const compiled = new CompilerService().compile(blueprint);
        const bars = compiled.components.display?.bars ?? [];
        const cycleBar = bars.find((b) => b.key === "state.cycle");

        expect(cycleBar).toBeUndefined();
    });

    it("defaults showProgressBar to false when omitted", () => {
        const blueprint = createBlueprint("bp_gen", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 50, perBody: 0, multPerBody: 0 },
                        costMultPerCycle: 0,
                        inputs: {
                            body: { base: 1, perBody: 0, multPerBody: 0 },
                        },
                        oneOff: false,
                        conditions: [],
                    },
                    passport: {
                        label: "Gen",
                        icon: "cog",
                    },
                    worldPresence: {
                        x: 0,
                        y: 0,
                        radius: { min: 10, max: 20 },
                    },
                },
            },
        });

        const compiled = new CompilerService().compile(blueprint);
        const bars = compiled.components.display?.bars ?? [];
        const cycleBar = bars.find((b) => b.key === "state.cycle");

        expect(cycleBar).toBeUndefined();
    });
});
