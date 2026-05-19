import { describe, expect, it } from "vitest";
import { CompilerService } from "../../../compiler/CompilerService";
import { createBlueprint } from "../../../test/factories";
import { BehaviorSystem } from "../BehaviorSystem";
import { Snapshot } from "../../Snapshot";
import { ImpulseEngine } from "../../../physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../../../data/schemas/physics";
import { makeHandlerContext } from "../../handlers/handlerTestUtils";
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
                    conditionalActivation: [
                        {
                            conditions: [
                                {
                                    kind: "world_state_boolean",
                                    key: "gate_a",
                                    value: true,
                                },
                            ],
                            targets: [{ ability: "cycle" }],
                        },
                        {
                            conditions: [
                                {
                                    kind: "world_state_boolean",
                                    key: "gate_b",
                                    value: true,
                                },
                            ],
                            targets: [{ ability: "cycle" }],
                        },
                    ],
                },
            },
        }),
    ).components;

const runTick = (entity: any, gateA: boolean, gateB: boolean) => {
    const commands: RuntimeCommand[] = [];
    new BehaviorSystem().tick(
        new Snapshot(
            [
                {
                    id: "sys_world",
                    state: {
                        gate_a: { value: gateA },
                        gate_b: { value: gateB },
                    },
                } as any,
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

describe("Cycle conditional activation throttle multi", () => {
    it("restores only when all cycle gates become active", () => {
        const compiled = compile();
        const createEntity = () => ({
            id: "actor",
            behavior: compiled.behavior,
            powerSink: { ...compiled.powerSink, throttle: 0 },
            state: {
                ...compiled.state,
                cycle: { value: 0, max: 5 },
                cycle_active: { value: 1, visible: false },
            },
        });
        const fullyOpen = createEntity();
        applyStateCommands(fullyOpen, runTick(fullyOpen, true, true));
        expect(runTick(fullyOpen, true, true)).toContainEqual(
            expect.objectContaining({
                type: RuntimeCommandType.UPDATE_POWER_SINK,
                payload: { entityId: "actor", throttle: 1 },
            }),
        );
        const halfOpen = createEntity();
        applyStateCommands(halfOpen, runTick(halfOpen, true, false));
        expect(runTick(halfOpen, true, false)).toContainEqual(
            expect.objectContaining({
                type: RuntimeCommandType.UPDATE_POWER_SINK,
                payload: { entityId: "actor", throttle: 0 },
            }),
        );
    });
});
