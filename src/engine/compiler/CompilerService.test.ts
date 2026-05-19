import { describe, it, expect } from "vitest";
import { CompilerService } from "./CompilerService";
import { createBlueprint } from "../test/factories";

describe("CompilerService", () => {
    it("returns a clone for legacy blueprints", () => {
        const blueprint = createBlueprint("legacy", { components: {} });
        const compiled = new CompilerService().compile(blueprint);

        expect(compiled).toEqual(blueprint);
        expect(compiled).not.toBe(blueprint);
    });

    it("generates cycle state, power, and behavior", () => {
        const blueprint = createBlueprint("cycler", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
                        costMultPerCycle: 0,
                        inputs: {
                            body: { base: 10, perBody: 0, multPerBody: 0 },
                        },
                        oneOff: false,
                        conditions: [],
                    },
                },
            },
        });

        const compiled = new CompilerService().compile(blueprint);

        expect(compiled.components.state?.cycle?.max).toBe(100);
        expect(compiled.components.powerSink?.baseDemand?.body).toBe(0);
        expect(compiled.components.passiveEffects?.length).toBeGreaterThan(0);

        const rule = compiled.components.behavior?.rules?.find(
            (entry) => entry.id === "sys_cycle_accumulate",
        );
        expect(rule).toBeTruthy();
        const action = rule?.actions?.[0];
        expect(action?.type).toBe("MUTATE");
        if (action?.type === "MUTATE") {
            expect(String(action.value)).toContain(
                "self.powerSink.allocatedDraw.body",
            );
        }

        const resetRule = compiled.components.behavior?.rules?.find(
            (entry) => entry.id === "sys_cycle_reset",
        );
        expect(resetRule).toBeTruthy();
    });

    it("compiles storage and production abilities", () => {
        const blueprint = createBlueprint("lumberjack", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 50, perBody: 0, multPerBody: 0 },
                        costMultPerCycle: 0,
                        inputs: {
                            body: { base: 10, perBody: 0, multPerBody: 0 },
                        },
                        oneOff: false,
                        conditions: [],
                    },
                    storage: [
                        {
                            resource: "wood",
                            capacity: { base: 100, perBody: 0, multPerBody: 0 },
                            isDefault: true,
                            entropy: { base: 0, perBody: 0, multPerBody: 0 },
                            visible: true,
                            allowDeposit: true,
                            allowWithdraw: true,
                            priority: 0,
                        },
                    ],
                    production: [
                        {
                            resource: "wood",
                            amount: { base: 1, perBody: 0, multPerBody: 0 },
                            conditions: [],
                        },
                    ],
                },
            },
        });

        const compiled = new CompilerService().compile(blueprint);

        expect(compiled.components.state?.wood).toBeDefined();
        expect(compiled.tags).toContain("storage:wood");

        const produceRule = compiled.components.behavior?.rules?.find(
            (entry) => entry.id === "sys_produce_wood_0",
        );
        const produceAction = produceRule?.actions?.[1];
        expect(produceAction).toMatchObject({
            type: "TRANSFER",
            target: "tag:storage:wood",
            resource: "wood",
        });
    });
});
