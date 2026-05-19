import { describe, expect, it } from "vitest";
import { Snapshot } from "../../Snapshot";
import { BehaviorSystem } from "../BehaviorSystem";
import { CompilerService } from "../../../compiler/CompilerService";
import { createBlueprint } from "../../../test/factories";
import { ImpulseEngine } from "../../../physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../../../data/schemas/physics";
import { RuntimeCommandType, type RuntimeCommand } from "../../types";

const buildCommands = () => {
    const list: RuntimeCommand[] = [];
    return {
        list,
        buffer: {
            enqueue: (command: RuntimeCommand) => list.push(command),
            drain: () => [],
            clear: () => undefined,
            size: () => list.length,
        } as any,
    };
};
const buildEntity = () =>
    ({
        ...new CompilerService().compile(
            createBlueprint("forge", {
                components: {},
                _editor: {
                    abilities: {
                        cycle: {
                            maxProgress: {
                                base: 10,
                                perBody: 0,
                                multPerBody: 0,
                            },
                            costMultPerCycle: 0,
                            inputs: {
                                body: { base: 2, perBody: 0, multPerBody: 0 },
                            },
                            oneOff: false,
                            resourceCosts: [
                                {
                                    resource: "food",
                                    amount: {
                                        base: 5,
                                        perBody: 0,
                                        multPerBody: 0,
                                    },
                                    scaleByBodiesOwned: false,
                                    scaleByCyclesCompleted: false,
                                    visible: true,
                                    priority: 0,
                                },
                            ],
                            conditions: [],
                        },
                    },
                },
            }),
        ).components,
        id: "forge",
    }) as any;

const runTick = (entity: any) => {
    const { list, buffer } = buildCommands();
    new BehaviorSystem().tick(
        new Snapshot(
            [{ id: "sys_world", state: {} } as any, entity],
            new ImpulseEngine(DEFAULT_IMPULSE_CONFIG),
        ),
        buffer,
        16,
    );
    return list;
};
describe("cycle resource cost behavior", () => {
    it("blocks cycle completion when the reservoir is short", () => {
        const entity = buildEntity();
        entity.state.cycle.value = 10;
        entity.state.food = {
            value: 2,
            allowDeposit: true,
            allowWithdraw: false,
            priority: 0,
        };
        entity.state.vals_cycle_cost_total_food = { value: 5 };
        entity.state.cycle_cost_req_food_timer = { value: 0 };
        const list = runTick(entity);
        expect(list).toEqual([
            expect.objectContaining({
                type: RuntimeCommandType.UPDATE_POWER_SINK,
                payload: { entityId: "forge", baseDemand: { body: 0 } },
            }),
        ]);
    });

    it("consumes the reservoir and resets the cycle when the requirement is met", () => {
        const entity = buildEntity();
        entity.state.cycle.value = 10;
        entity.state.food = {
            value: 5,
            allowDeposit: true,
            allowWithdraw: false,
            priority: 0,
        };
        entity.state.vals_cycle_cost_total_food = { value: 5 };
        entity.state.cycle_cost_req_food_timer = { value: 0 };
        const list = runTick(entity);
        expect(list).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: RuntimeCommandType.ADJUST_STATE,
                    payload: { entityId: "forge", key: "food", delta: -5 },
                }),
                expect.objectContaining({
                    type: RuntimeCommandType.UPDATE_STATE,
                    payload: { entityId: "forge", key: "cycle", value: 0 },
                }),
            ]),
        );
        expect(
            list.some(
                (command) =>
                    command.type === RuntimeCommandType.UPDATE_POWER_SINK &&
                    command.payload.baseDemand?.body === 0,
            ),
        ).toBe(false);
    });
});
