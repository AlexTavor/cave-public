import { describe, expect, it } from "vitest";
import { Snapshot } from "../../Snapshot";
import { ImpulseEngine } from "../../../physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../../../data/schemas/physics";
import { RuntimeCommandType, type RuntimeEntity } from "../../types";
import { BehaviorSystem } from "../BehaviorSystem";
import { CompilerService } from "../../../compiler/CompilerService";
import { createBlueprint } from "../../../test/factories";

const compileComponents = () =>
    new CompilerService().compile(
        createBlueprint("egg", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 5, perBody: 0, multPerBody: 0 },
                        costMultPerCycle: 0,
                        inputs: {
                            body: { base: 1, perBody: 0, multPerBody: 0 },
                        },
                        oneOff: true,
                        startActive: true,
                        conditions: [],
                    },
                },
            } as any,
        }),
    ).components;

describe("One-off cycle power sink shutdown", () => {
    it("zeros throttle and demand when depleted", () => {
        const components = compileComponents();
        const entity: RuntimeEntity = {
            id: "egg_1",
            behavior: components.behavior,
            powerSink: components.powerSink,
            state: {
                ...components.state,
                cycle: { value: 5, max: 5, visible: true },
                cycle_active: { value: 1, visible: false },
                is_depleted: { value: 0, visible: false },
            },
        };
        const commands: any[] = [];

        new BehaviorSystem().tick(
            new Snapshot(
                [{ id: "sys_world", state: {} } as any, entity],
                new ImpulseEngine(DEFAULT_IMPULSE_CONFIG),
            ),
            {
                enqueue: (c: any) => commands.push(c),
                drain: () => [],
                clear: () => undefined,
                size: () => commands.length,
            },
            20,
        );

        expect(
            commands.some(
                (command) =>
                    command.type === RuntimeCommandType.UPDATE_POWER_SINK &&
                    command.payload.entityId === "egg_1" &&
                    command.payload.throttle === 0 &&
                    command.metadata?.sourceLane === "behavior_rule",
            ),
        ).toBe(true);
        expect(
            commands.some(
                (command) =>
                    command.type === RuntimeCommandType.UPDATE_POWER_SINK &&
                    command.payload.entityId === "egg_1" &&
                    command.payload.baseDemand?.body === 0 &&
                    command.metadata?.sourceLane === "behavior_rule",
            ),
        ).toBe(true);
        expect(
            commands.some(
                (command) =>
                    command.type === RuntimeCommandType.UPDATE_POWER_SINK &&
                    command.payload.entityId === "egg_1" &&
                    command.payload.maxDemand?.body === 0 &&
                    command.metadata?.sourceLane === "behavior_rule",
            ),
        ).toBe(true);
    });
});
