import { describe, expect, it } from "vitest";
import { CompilerService } from "../../../compiler/CompilerService";
import { createBlueprint } from "../../../test/factories";
import { BehaviorSystem } from "../BehaviorSystem";
import { Snapshot } from "../../Snapshot";
import { ImpulseEngine } from "../../../physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../../../data/schemas/physics";
import { makeHandlerContext } from "../../handlers/handlerTestUtils";
import { UpdatePowerSinkHandler } from "../../handlers/UpdatePowerSinkHandler";
import { UpdateStateHandler } from "../../handlers/UpdateStateHandler";
import { RuntimeCommandType, type RuntimeCommand } from "../../types";

const compile = () =>
    new CompilerService().compile(
        createBlueprint("bp", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 5, perBody: 0, multPerBody: 0 },
                        inputs: {
                            body: { base: 1, perBody: 0, multPerBody: 0 },
                        },
                        oneOff: false,
                        startActive: true,
                        conditions: [],
                    },
                    conditionalActivation: {
                        conditions: [
                            {
                                kind: "world_state_boolean",
                                key: "gate",
                                value: true,
                            },
                        ],
                        targets: [{ ability: "cycle" }],
                    },
                },
            },
        }),
    );

const createEntity = (throttle: number) => {
    const compiled = compile().components;
    return {
        id: "actor",
        behavior: compiled.behavior,
        powerSink: { ...compiled.powerSink, throttle },
        state: {
            ...compiled.state,
            cycle: { value: 0, max: 5 },
            cycle_active: { value: 1, visible: false },
        },
    };
};

const runTick = (entity: any, gate: boolean) => {
    const commands: RuntimeCommand[] = [];
    new BehaviorSystem().tick(
        new Snapshot(
            [
                { id: "sys_world", state: { gate: { value: gate } } } as any,
                entity,
            ],
            new ImpulseEngine(DEFAULT_IMPULSE_CONFIG),
        ),
        {
            enqueue: (c: RuntimeCommand) => commands.push(c),
            drain: () => [],
            clear: () => undefined,
            size: () => commands.length,
        },
        16,
    );
    return commands;
};

const applyStateCommands = (entity: any, commands: RuntimeCommand[]) => {
    const context = makeHandlerContext();
    context.world.add({ id: "sys_world", state: {} } as any);
    context.world.add(entity);
    const handler = new UpdateStateHandler();
    commands
        .filter((command) => command.type === RuntimeCommandType.UPDATE_STATE)
        .forEach((command) => handler.handle(command as any, context));
};

describe("Cycle conditional activation throttle", () => {
    it("emits throttle restore when the activation gate is true", () => {
        const entity = createEntity(0);
        applyStateCommands(entity, runTick(entity, true));
        expect(runTick(entity, true)).toContainEqual(
            expect.objectContaining({
                type: RuntimeCommandType.UPDATE_POWER_SINK,
                payload: { entityId: "actor", throttle: 1 },
            }),
        );
    });

    it("emits shutdown in behavior phase and applies throttle zero on the next apply phase", () => {
        const entity = createEntity(0.75);
        const shutdown = runTick(entity, false).find(
            (c) => c.type === RuntimeCommandType.UPDATE_POWER_SINK,
        );
        expect(shutdown).toMatchObject({
            payload: { entityId: "actor", throttle: 0 },
        });
        const context = makeHandlerContext();
        context.world.add({ id: "sys_world", state: {} } as any);
        context.world.add(entity);
        new UpdatePowerSinkHandler().handle(shutdown as any, context);
        expect(entity.powerSink.throttle).toBe(0);
    });
});
