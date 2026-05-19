import { describe, expect, it, vi } from "vitest";
import { World } from "miniplex";
import { Snapshot } from "../../engine/runtime/Snapshot";
import type {
    RuntimeCommand,
    RuntimeEntity,
    UpdatePowerSinkCommand,
} from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import type { ModuleCartridge } from "../../data/schemas/module";
import { DEFAULT_GAME_CONFIG } from "../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../../data/schemas/assets";
import { ImpulseEngine } from "../../engine/physics/impulse/ImpulseEngine";
import { UpdatePowerSinkHandler } from "../../engine/runtime/handlers/UpdatePowerSinkHandler";
import { EnergyDistributionSystem } from "./EnergyDistributionSystem";

const makeModule = (): ModuleCartridge => ({
    metadata: { id: "test", name: "Test", version: "0.0.1" },
    blueprints: {},
    assets: {
        displays: {},
        icons: {},
        resources: {},
        styles: {},
        traits: {},
        settings: {
            impulse: DEFAULT_IMPULSE_CONFIG,
            game_config: DEFAULT_GAME_CONFIG,
            vein_network: DEFAULT_VEIN_CONFIG,
        },
    },
});

const createBuffer = () => {
    const buffer: RuntimeCommand[] = [];
    return {
        buffer,
        commands: {
            enqueue: (command: RuntimeCommand) => buffer.push(command),
            drain: () => buffer.splice(0, buffer.length),
            clear: () => buffer.splice(0, buffer.length),
            size: () => buffer.length,
        },
    };
};

describe("Power sink throttling integration", () => {
    it("updates throttle and affects efficiency", () => {
        const world = new World<RuntimeEntity>();
        world.add({
            id: "sys_world",
            state: { power_body: { value: 10 } },
        });
        world.add({
            id: "sink_a",
            powerSink: {
                baseDemand: { body: 10, mind: 0, social: 0 },
                maxDemand: { body: 10, mind: 0, social: 0 },
                throttle: 1,
                efficiency: 0,
                drawFraction: {},
                status: "blackout",
            },
        });

        const handler = new UpdatePowerSinkHandler();
        handler.handle(
            {
                type: RuntimeCommandType.UPDATE_POWER_SINK,
                payload: {
                    entityId: "sink_a",
                    throttle: 0.5,
                    efficiency: 0,
                    drawFraction: {},
                    status: "blackout",
                },
            },
            {
                world,
                cartridge: makeModule(),
                impulseEngine: new ImpulseEngine(DEFAULT_IMPULSE_CONFIG),
                markEntityListDirty: () => {},
                telemetry: { log: vi.fn() },
            },
        );

        const entity = world.entities.find((e) => e.id === "sink_a") as
            | (RuntimeEntity & { powerSink: { throttle: number } })
            | undefined;
        expect(entity?.powerSink.throttle).toBe(0.5);

        const snapshot = new Snapshot(
            [...world.entities],
            new ImpulseEngine(DEFAULT_IMPULSE_CONFIG),
        );
        const system = new EnergyDistributionSystem();
        const { buffer, commands } = createBuffer();
        system.tick(snapshot, commands, 16);

        const update = buffer.find(
            (command) =>
                command.type === RuntimeCommandType.UPDATE_POWER_SINK &&
                command.payload.entityId === "sink_a",
        ) as UpdatePowerSinkCommand | undefined;

        expect(update?.payload.efficiency).toBeCloseTo(0.5);
    });
});

