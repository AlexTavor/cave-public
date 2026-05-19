import { describe, expect, it } from "vitest";
import { CaveSystem } from "./CaveSystem";
import { Snapshot } from "../../engine/runtime/Snapshot";
import type {
    CommandBuffer,
    RuntimeCommand,
    RuntimeEntity,
} from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { resolveXpThreshold } from "./body/progression";
import { DEFAULT_GAME_CONFIG } from "../../data/schemas/game/config";

const makeBuffer = (): CommandBuffer<RuntimeCommand> & {
    commands: RuntimeCommand[];
} => {
    const commands: RuntimeCommand[] = [];
    return {
        enqueue: (c: RuntimeCommand) => commands.push(c),
        drain: () => {
            const c = [...commands];
            commands.length = 0;
            return c;
        },
        clear: () => {
            commands.length = 0;
        },
        size: () => commands.length,
        commands,
    } as CommandBuffer<RuntimeCommand> & { commands: RuntimeCommand[] };
};

const snap = (entities: RuntimeEntity[]) =>
    new Snapshot(entities, { getBody: () => undefined } as any);

describe("CaveSystem", () => {
    it("generates skillpoint on level up without triggering draft", () => {
        const system = new CaveSystem(DEFAULT_GAME_CONFIG);
        const buffer = makeBuffer();
        const threshold = resolveXpThreshold(1);
        const world: RuntimeEntity = {
            id: "sys_world",
            state: { xp: { value: threshold, visible: false } },
            cave: { progression: { xp: threshold, level: 1, skillpoints: 0 } },
        };
        system.tick(snap([world]), buffer, 1000);
        expect(buffer.commands).toContainEqual({
            type: RuntimeCommandType.UPDATE_CAVE,
            payload: {
                entityId: "sys_world",
                xp: threshold,
                level: 2,
                skillpoints: 1,
            },
        });
        expect((world as any).state?.xp?.value).toBe(0);
        expect(
            buffer.commands.find(
                (c) => c.type === RuntimeCommandType.TRIGGER_DRAFT,
            ),
        ).toBeUndefined();
    });

    it("triggers the level-up draft without consuming the skillpoint yet", () => {
        const system = new CaveSystem(DEFAULT_GAME_CONFIG);
        const buffer = makeBuffer();
        const world: RuntimeEntity = {
            id: "sys_world",
            cave: { progression: { xp: 5, level: 2, skillpoints: 1 } },
        };
        system.tick(snap([world]), buffer, 1000);
        expect(buffer.commands).toContainEqual({
            type: RuntimeCommandType.TRIGGER_DRAFT,
            payload: {
                poolId: "pool_level_up",
                triggerEntityId: "sys_world",
                label: "Level 2 Reward",
            },
        });
    });

    it("does nothing when skillpoint exists and draft is active", () => {
        const system = new CaveSystem(DEFAULT_GAME_CONFIG);
        const buffer = makeBuffer();
        const world: RuntimeEntity = {
            id: "sys_world",
            draft: { active: true, slots: [], selected: null, source: null },
            state: { xp: { value: 10, visible: false } },
            cave: { progression: { xp: 3, level: 1, skillpoints: 1 } },
        };
        system.tick(snap([world]), buffer, 1000);
        expect(buffer.commands).toEqual([]);
    });

    it("skips xp drain when consuming pending skillpoint", () => {
        const system = new CaveSystem(DEFAULT_GAME_CONFIG);
        const buffer = makeBuffer();
        const world: RuntimeEntity = {
            id: "sys_world",
            state: { xp: { value: 999, visible: false } },
            cave: { progression: { xp: 0, level: 3, skillpoints: 1 } },
        };
        system.tick(snap([world]), buffer, 1000);
        const drain = buffer.commands.find(
            (c) => c.type === RuntimeCommandType.ADJUST_STATE,
        );
        expect(drain).toBeUndefined();
    });
});

