import { Snapshot } from "../../engine/runtime/Snapshot";
import type {
    CommandBuffer,
    RuntimeCommand,
    RuntimeEntity,
} from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { createDefaultCaveMind } from "../../data/schemas/game/caveMind";
import type { CaveMind } from "../../data/schemas/game/caveMind";
import { CaveMindSystem } from "./CaveMindSystem";

type TestWorldEntity = RuntimeEntity & {
    state: Record<string, { value?: unknown; max?: unknown }>;
    cave: {
        attributes: { body: number; mind: number; social: number };
        progression: { xp: number; level: number; skillpoints: number };
        purge: { isActive: boolean; nextKillTimer: number };
        mind: CaveMind;
    };
    physics: { x: number; y: number; radius: number };
};

export const makeBuffer = (): CommandBuffer<RuntimeCommand> & {
    commands: RuntimeCommand[];
} => {
    const commands: RuntimeCommand[] = [];
    return {
        enqueue: (command: RuntimeCommand) => commands.push(command),
        drain: () => [...commands],
        clear: () => {
            commands.splice(0, commands.length);
        },
        size: () => commands.length,
        commands,
    } as any;
};

export const makeWorld = (
    overrides: Partial<TestWorldEntity> = {},
): TestWorldEntity => ({
    id: "sys_world",
    state: {
        comfort: { value: 0.5, max: 1 },
        cave_selected_entity_id: { value: "" },
        cave_drag_entity_id: { value: "" },
        cave_drag_active: { value: false },
        cave_evt_purge_began: { value: 0 },
        cave_evt_purge_kill: { value: 0 },
        cave_evt_absorption_complete: { value: 0 },
        cave_evt_butchered: { value: 0 },
    },
    run: { elapsed_real_seconds: { world: 0 } },
    cave: {
        attributes: { body: 10, mind: 10, social: 10 },
        progression: { xp: 0, level: 1, skillpoints: 0 },
        purge: { isActive: false, nextKillTimer: 0 },
        mind: createDefaultCaveMind(),
    },
    physics: { x: 0, y: 0, radius: 150 },
    ...overrides,
});

export const makeNode = (
    id: string,
    overrides: Partial<RuntimeEntity> = {},
): RuntimeEntity => ({
    id,
    state: {},
    physics: { x: 30, y: 0, radius: 20 },
    ...overrides,
});

export const runMind = (entities: RuntimeEntity[]) => {
    const system = new CaveMindSystem();
    const buffer = makeBuffer();
    const snapshot = new Snapshot(entities, {
        getBody: (id: string) => {
            const entity = entities.find(
                (candidate) => candidate.id === id,
            ) as any;
            const physics = entity?.physics;
            return physics
                ? {
                      position: { x: physics.x, y: physics.y },
                      radius: physics.radius,
                  }
                : undefined;
        },
    } as any);
    system.tick(snapshot, buffer);
    return buffer.commands.find(
        (command) => command.type === RuntimeCommandType.UPDATE_CAVE,
    ) as any;
};
