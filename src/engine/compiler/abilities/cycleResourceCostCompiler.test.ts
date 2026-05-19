import { describe, expect, it } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";

const compileCycle = (inputs: Record<string, unknown> = {}, visible = true) =>
    new CompilerService().compile(
        createBlueprint("forge", {
            components: { display: { label: "Forge", display_key: "forge" } },
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 10, perBody: 0, multPerBody: 0 },
                        costMultPerCycle: 0,
                        inputs,
                        oneOff: false,
                        resourceCosts: [
                            {
                                resource: "food",
                                amount: { base: 3, perBody: 0, multPerBody: 0 },
                                scaleByBodiesOwned: false,
                                scaleByCyclesCompleted: true,
                                visible,
                                priority: 2,
                            },
                        ],
                        conditions: [],
                    },
                },
            },
        }),
    );

describe("cycleResourceCostCompiler", () => {
    it("adds cycle bar when a visible cycle-cost reservoir bar is compiled", () => {
        const compiled = compileCycle();
        expect(compiled.components.state?.food).toMatchObject({
            allowDeposit: true,
            allowWithdraw: false,
            max: 0,
            priority: 2,
        });
        expect(compiled.components.passiveEffects).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    target: "self.state.food.max",
                    source: "self.state.vals_cycle_cost_total_food.value",
                }),
            ]),
        );
        expect(compiled.components.state?.cycle_count).toEqual({
            value: 1,
            visible: false,
        });
        expect(
            compiled.components.behavior?.rules?.map((rule) => rule.id),
        ).toEqual(
            expect.arrayContaining([
                "sys_cycle_cost_consume_food",
                "sys_cycle_cost_req_food",
            ]),
        );
        expect(compiled.components.display?.bars).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    key: "state.food",
                    maxKey: "state.vals_cycle_cost_total_food.value",
                }),
                expect.objectContaining({ key: "state.cycle" }),
            ]),
        );
        expect(
            compiled.components.display?.bars?.filter(
                (bar) => bar.key === "state.cycle",
            ),
        ).toHaveLength(1);
    });

    it("adds cycle-cost power gate rule for authored cycle input attributes", () => {
        const compiled = compileCycle(
            { body: { base: 1 }, social: { base: 0, perBody: 1 } },
            false,
        );
        const rule = compiled.components.behavior?.rules?.find(
            (entry) => entry.id === "sys_cycle_cost_power_gate_food",
        );
        const actionTargets =
            (rule?.actions as Array<{ target?: string }> | undefined)?.map(
                (action) => action.target ?? "",
            ) ?? [];
        expect(rule?.conditions).toEqual([
            expect.objectContaining({
                id: "missing_cycle_cost_food",
                tokens: expect.arrayContaining([
                    { t: "ref", v: "self.state.food.value" },
                    { t: "op", v: "<" },
                    {
                        t: "ref",
                        v: "self.state.vals_cycle_cost_total_food.value",
                    },
                ]),
            }),
        ]);
        expect(rule?.actions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    target: "self.powerSink.baseDemand.body",
                    value: 0,
                }),
                expect.objectContaining({
                    target: "self.powerSink.baseDemand.social",
                    value: 0,
                }),
            ]),
        );
        expect(
            actionTargets.some((target) => target.includes("maxDemand")),
        ).toBe(false);
    });

    it("does not add a cycle-cost power gate rule when the cycle has no authored input attributes", () => {
        const compiled = compileCycle();
        expect(
            compiled.components.behavior?.rules?.some((rule) =>
                rule.id.startsWith("sys_cycle_cost_power_gate_"),
            ),
        ).toBe(false);
    });
});
