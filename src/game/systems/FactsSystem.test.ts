import { describe, expect, it } from "vitest";
import { FactsSystem } from "./FactsSystem";
import { Snapshot } from "../../engine/runtime/Snapshot";

describe("FactsSystem", () => {
    it("enqueues real and game time fact updates", () => {
        const commands: any[] = [];
        const system = new FactsSystem(() => 2);

        system.tick(
            new Snapshot([{ id: "sys_world" }], {
                getBody: () => undefined,
            } as any),
            { enqueue: (command: unknown) => commands.push(command) } as any,
            1000,
        );

        expect(commands).toEqual([
            {
                type: "ADJUST_FACT",
                payload: {
                    scope: "run",
                    factType: "elapsed_real_seconds",
                    factAbout: "world",
                    delta: 0.5,
                },
            },
            {
                type: "ADJUST_FACT",
                payload: {
                    scope: "permanent",
                    factType: "elapsed_real_seconds",
                    factAbout: "world",
                    delta: 0.5,
                },
            },
            {
                type: "ADJUST_FACT",
                payload: {
                    scope: "run",
                    factType: "elapsed_game_seconds",
                    factAbout: "world",
                    delta: 1,
                },
            },
            {
                type: "ADJUST_FACT",
                payload: {
                    scope: "permanent",
                    factType: "elapsed_game_seconds",
                    factAbout: "world",
                    delta: 1,
                },
            },
        ]);
    });

    it("reconciles the active body count into a run fact", () => {
        const commands: any[] = [];
        const system = new FactsSystem(() => 1);

        system.tick(
            new Snapshot(
                [
                    { id: "sys_world", run: { active_bodies: { world: 1 } } },
                    { id: "body-1", body: {} },
                    { id: "body-2", body: {} },
                ],
                { getBody: () => undefined } as any,
            ),
            { enqueue: (command: unknown) => commands.push(command) } as any,
            1000,
        );

        expect(commands.at(-1)).toEqual({
            type: "ADJUST_FACT",
            payload: {
                scope: "run",
                factType: "active_bodies",
                factAbout: "world",
                delta: 1,
            },
        });
    });

    it("counts the same bodies as population even when assigned or locked", () => {
        const commands: any[] = [];
        const system = new FactsSystem(() => 1);

        system.tick(
            new Snapshot(
                [
                    { id: "sys_world", run: { active_bodies: { world: 1 } } },
                    {
                        id: "body-1",
                        body: {},
                        state: { flag_locked: { value: true } },
                    },
                    { id: "body-2", body: {} },
                    { id: "job-1", assignment: { assignedIds: ["body-2"] } },
                ],
                { getBody: () => undefined } as any,
            ),
            { enqueue: (command: unknown) => commands.push(command) } as any,
            1000,
        );

        expect(commands.at(-1)).toEqual({
            type: "ADJUST_FACT",
            payload: {
                scope: "run",
                factType: "active_bodies",
                factAbout: "world",
                delta: 1,
            },
        });
    });
});
