import { World } from "miniplex";
import { Snapshot } from "../../engine/runtime/Snapshot";
import type { RuntimeCommand, RuntimeEntity } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { ImpulseEngine } from "../../engine/physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";

export type Demand = { body: number; mind: number; social: number };

export const createBuffer = () => {
    const buffer: RuntimeCommand[] = [];
    return {
        buffer,
        commandBuffer: {
            enqueue: (command: RuntimeCommand) => buffer.push(command),
            drain: () => buffer.splice(0, buffer.length),
            clear: () => buffer.splice(0, buffer.length),
            size: () => buffer.length,
        },
    };
};

export const buildSnapshot = (entities: RuntimeEntity[]) => {
    const world = new World<RuntimeEntity>();
    entities.forEach((entity) => world.add(entity));
    return new Snapshot(
        [...world.entities],
        new ImpulseEngine(DEFAULT_IMPULSE_CONFIG),
    );
};

export const makeWorld = (power: Partial<Demand>) => ({
    id: "sys_world",
    state: {
        power_body: { value: power.body ?? 0 },
        power_mind: { value: power.mind ?? 0 },
        power_social: { value: power.social ?? 0 },
    },
});

export const makeSink = (
    id: string,
    baseDemand: Demand,
    throttle = 1,
    maxDemand?: Demand,
) => ({
    id,
    powerSink: {
        baseDemand,
        maxDemand,
        throttle,
        efficiency: 0,
        drawFraction: {},
        status: "blackout",
    },
});

export const getUpdate = (buffer: RuntimeCommand[], entityId: string) =>
    buffer.find(
        (command) =>
            command.type === RuntimeCommandType.UPDATE_POWER_SINK &&
            command.payload.entityId === entityId,
    );