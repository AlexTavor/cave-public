import { describe, expect, it } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";
import type { CycleResourceCostConfig } from "../../../data/schemas/abilities/cycle";

const compileCycle = (resourceCosts: CycleResourceCostConfig[]) =>
    new CompilerService().compile(
        createBlueprint("forge", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 10, perBody: 0, multPerBody: 0 },
                        costMultPerCycle: 0,
                        inputs: {
                            body: { base: 1, perBody: 0, multPerBody: 0 },
                        },
                        oneOff: false,
                        resourceCosts,
                        conditions: [],
                    },
                },
            },
        }),
    );

describe("cycle resource cost request compiler", () => {
    it("adds request timer need limit state and exact plus capped rules", () => {
        const compiled = compileCycle([
            {
                resource: "food",
                amount: { base: 3, perBody: 0, multPerBody: 0 },
                scaleByBodiesOwned: false,
                scaleByCyclesCompleted: false,
                visible: true,
                priority: 1,
            },
        ]);

        expect(compiled.components.state).toMatchObject({
            cycle_cost_req_food_timer: { value: 0, visible: false },
            cycle_cost_req_food_need: { value: 0, visible: false },
            cycle_cost_req_food_limit: { value: 0, visible: false },
        });
        expect(
            compiled.components.behavior?.rules?.map((rule) => rule.id),
        ).toEqual(
            expect.arrayContaining([
                "sys_cycle_cost_req_food",
                "sys_cycle_cost_req_cap_food",
            ]),
        );
        expect(compiled.components.passiveEffects).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    target: "self.state.cycle_cost_req_food_limit.value",
                    value: 999999,
                }),
                expect.objectContaining({
                    target: "self.state.cycle_cost_req_food_limit.value",
                    source: "self.powerSink.throttle",
                }),
            ]),
        );
    });

    it("fails when same-resource rows disagree on request settings", () => {
        expect(() =>
            compileCycle([
                {
                    resource: "food",
                    amount: { base: 1, perBody: 0, multPerBody: 0 },
                    requestCadenceSeconds: 1,
                },
                {
                    resource: "food",
                    amount: { base: 2, perBody: 0, multPerBody: 0 },
                    requestCadenceSeconds: 2,
                },
            ]),
        ).toThrow(/forge.*food.*0.*1/);
    });
});
