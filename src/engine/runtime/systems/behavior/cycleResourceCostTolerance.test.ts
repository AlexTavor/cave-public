import { describe, expect, it } from "vitest";
import { Snapshot } from "../../Snapshot";
import { BehaviorSystem } from "../BehaviorSystem";
import { CompilerService } from "../../../compiler/CompilerService";
import { createBlueprint } from "../../../test/factories";
import { ImpulseEngine } from "../../../physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../../../data/schemas/physics";
import { RuntimeCommandType, type RuntimeCommand } from "../../types";

const makeCommands = () => {
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

const makeEntity = () =>
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

describe("cycle resource cost tolerance", () => {
    it("allows cycle completion when the remaining shortfall is under one unit", () => {
        const entity = makeEntity();
        entity.state.cycle.value = 10;
        entity.state.food = {
            value: 4.1,
            allowDeposit: true,
            allowWithdraw: false,
        };
        entity.state.vals_cycle_cost_total_food = { value: 5 };
        entity.state.cycle_cost_req_food_timer = { value: 0 };
        const { list, buffer } = makeCommands();

        new BehaviorSystem().tick(
            new Snapshot(
                [{ id: "sys_world", state: {} } as any, entity],
                new ImpulseEngine(DEFAULT_IMPULSE_CONFIG),
            ),
            buffer,
            16,
        );

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
