import { describe, expect, it } from "vitest";
import { CompilerService } from "../../../engine/compiler/CompilerService";
import { createBlueprint } from "../../../engine/test/factories";
import { Snapshot } from "../../../engine/runtime/Snapshot";
import { ImpulseEngine } from "../../../engine/physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../../data/schemas/physics";
import { makeHandlerContext } from "../../../engine/runtime/handlers/handlerTestUtils";
import { UpdateStateHandler } from "../../../engine/runtime/handlers/UpdateStateHandler";
import { AdjustStateHandler } from "../../../engine/runtime/handlers/AdjustStateHandler";
import { UpdatePowerSinkHandler } from "../../../engine/runtime/handlers/UpdatePowerSinkHandler";
import {
    RuntimeCommandType,
    type RuntimeCommand,
    type RuntimeEntity,
    type CommandBuffer,
} from "../../../engine/runtime/types";
import type { System } from "../../../engine/runtime/systems/System";
import { BehaviorSystem } from "../../../engine/runtime/systems/BehaviorSystem";
import { PassiveEffectsSystem } from "./PassiveEffectSystem";

type StateEntry = { value?: number; max?: number };
type Subject = {
    id: string;
    state: Record<string, StateEntry>;
    powerSink: { baseDemand: { mind: number } };
};

const entity = (): Subject =>
    ({
        ...new CompilerService().compile(
            createBlueprint("buy", {
                components: {},
                _editor: {
                    abilities: {
                        cycle: {
                            maxProgress: {
                                base: 50,
                                perBody: 0,
                                multPerBody: 0,
                            },
                            costMultPerCycle: 1,
                            inputs: {
                                mind: { base: 20, perBody: 0, multPerBody: 0 },
                            },
                            oneOff: false,
                            resourceCosts: [
                                {
                                    resource: "coin",
                                    amount: {
                                        base: 100,
                                        perBody: 0,
                                        multPerBody: 0,
                                    },
                                    scaleByBodiesOwned: false,
                                    scaleByCyclesCompleted: true,
                                    visible: true,
                                    priority: 1,
                                },
                            ],
                            conditions: [],
                        },
                    },
                },
            }),
        ).components,
        id: "buy",
    }) as unknown as Subject;

const tick = (subject: Subject, system: System) => {
    const list: RuntimeCommand[] = [];
    const buffer = {
        enqueue: (command: RuntimeCommand) => list.push(command),
        drain: () => [],
        clear: () => undefined,
        size: () => list.length,
    } as unknown as CommandBuffer<RuntimeCommand>;
    system.tick(
        new Snapshot(
            [
                { id: "sys_world", state: {} } as unknown as RuntimeEntity,
                subject as unknown as RuntimeEntity,
            ],
            new ImpulseEngine(DEFAULT_IMPULSE_CONFIG),
        ),
        buffer,
        16,
    );
    const context = makeHandlerContext();
    context.world.add({
        id: "sys_world",
        state: {},
    } as unknown as RuntimeEntity);
    context.world.add(subject as unknown as RuntimeEntity);
    const update = new UpdateStateHandler();
    const adjust = new AdjustStateHandler();
    const power = new UpdatePowerSinkHandler();
    for (const command of list) {
        if (command.type === RuntimeCommandType.UPDATE_STATE)
            update.handle(command, context);
        if (command.type === RuntimeCommandType.ADJUST_STATE)
            adjust.handle(command, context);
        if (command.type === RuntimeCommandType.UPDATE_POWER_SINK)
            power.handle(command, context);
    }
};

describe("cycle resource cost repeat", () => {
    it("recomputes scaled costs and consumes them on repeated completions", () => {
        const buy = entity();
        tick(buy, new PassiveEffectsSystem());
        expect(buy.state).toMatchObject({
            cycle: { max: 50 },
            coin: { max: 100 },
            vals_cycle_cost_total_coin: { value: 100 },
        });
        tick(buy, new PassiveEffectsSystem());
        expect(buy.state).toMatchObject({
            cycle: { max: 50 },
            coin: { max: 100 },
        });

        buy.state.coin.value = 0;
        buy.state.cycle.value = 50;
        tick(buy, new BehaviorSystem());
        expect(buy.powerSink.baseDemand.mind).toBe(0);
        tick(buy, new PassiveEffectsSystem());
        expect(buy.powerSink.baseDemand.mind).toBe(20);
        expect(buy.state.cycle.max).toBe(50);

        buy.state.coin.value = 100;
        buy.state.cycle.value = 50;
        tick(buy, new BehaviorSystem());
        expect(buy.state).toMatchObject({
            cycle: { value: 0 },
            coin: { value: 0 },
            cycle_count: { value: 2 },
        });

        tick(buy, new PassiveEffectsSystem());
        expect(buy.state).toMatchObject({
            cycle: { max: 100 },
            coin: { max: 200 },
            vals_cycle_cost_total_coin: { value: 200 },
        });

        buy.state.coin.value = 200;
        buy.state.cycle.value = 100;
        tick(buy, new BehaviorSystem());
        expect(buy.state).toMatchObject({
            cycle: { value: 0 },
            coin: { value: 0 },
            cycle_count: { value: 3 },
        });
    });
});
